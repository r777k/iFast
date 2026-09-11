from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from database import get_db_connection
from dependencies import get_current_user

router = APIRouter(prefix="/fasting-sessions", tags=["Sessions"])

class StartSession(BaseModel):
    last_meal_time: datetime
    target_duration_hours: float = 16.0
    notes: Optional[str] = None

class EndSession(BaseModel):
    actual_fast_end_time: datetime
    notes: Optional[str] = None

@router.post("")
async def start_session(payload: StartSession, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        await conn.execute(
            "UPDATE fasting_sessions SET status = 'broken' WHERE user_id = $1 AND status = 'active'",
            user_id
        )
        
        # Changed ::timestamp to ::timestamptz
        query = """
            INSERT INTO fasting_sessions (
                user_id, session_date, last_meal_time, fast_start_time, 
                planned_fast_end_time, target_duration_hours, status, notes
            ) VALUES (
                $1, CURRENT_DATE, $2::timestamptz, $2::timestamptz, 
                $2::timestamptz + ($3::numeric * INTERVAL '1 hour'), $3::numeric, 'active', $4
            ) RETURNING id, session_date, fast_start_time, planned_fast_end_time, status
        """
        row = await conn.fetchrow(
            query, user_id, payload.last_meal_time, payload.target_duration_hours, payload.notes
        )
        return dict(row)

@router.get("/today")
async def get_today_session(user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        query = "SELECT * FROM current_fasting_sessions WHERE user_id = $1 LIMIT 1"
        row = await conn.fetchrow(query, user_id)
        
        if not row:
            return {}
        return dict(row)

@router.post("/{session_id}/end")
async def end_session(session_id: str, payload: EndSession, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # Changed ::timestamp to ::timestamptz
        query = """
            UPDATE fasting_sessions 
            SET status = 'completed', 
                actual_fast_end_time = $1::timestamptz,
                actual_duration_hours = EXTRACT(EPOCH FROM ($1::timestamptz - fast_start_time)) / 3600,
                is_goal_met = (EXTRACT(EPOCH FROM ($1::timestamptz - fast_start_time)) / 3600) >= target_duration_hours,
                notes = COALESCE($2, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND user_id = $4 AND status = 'active'
            RETURNING id, status, actual_duration_hours, is_goal_met
        """
        row = await conn.fetchrow(query, payload.actual_fast_end_time, payload.notes, session_id, user_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Active session not found")
            
        return dict(row)


# Append to routers/sessions.py

class SnackLog(BaseModel):
    snack_time: datetime
    meal_size: str
    description: Optional[str] = None

class SnackDecision(BaseModel):
    decision: str  # 'restart', 'ignore', 'end'
    meal_id: str

@router.post("/{session_id}/log-snack")
async def log_snack(session_id: str, payload: SnackLog, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # 1. Fetch active session to calculate elapsed time
        session = await conn.fetchrow(
            "SELECT fast_start_time FROM fasting_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
            session_id, user_id
        )
        if not session:
            raise HTTPException(status_code=404, detail="Active fasting session not found")
            
        elapsed_delta = payload.snack_time.replace(tzinfo=None) - session['fast_start_time'].replace(tzinfo=None)
        elapsed_hours = round(elapsed_delta.total_seconds() / 3600, 2)

        # 2. Log the snack to the meals table
        meal = await conn.fetchrow(
            """
            INSERT INTO meals (fasting_session_id, user_id, meal_time, meal_type, meal_size, description)
            VALUES ($1, $2, $3::timestamptz, 'snack', $4, $5)
            RETURNING id
            """,
            session_id, user_id, payload.snack_time, payload.meal_size, payload.description
        )

        # 3. Return the decision tree required by the frontend
        return {
            "meal_id": str(meal['id']),
            "current_elapsed_hours": max(0, elapsed_hours),
            "decision_options": [
                {
                    "id": "restart",
                    "title": "Treat this as my last meal and restart the fast",
                    "description": "Your new fast will start from now. Previous progress is saved."
                },
                {
                    "id": "ignore",
                    "title": "This was just a small snack. Keep my fast going",
                    "description": "Your fasting timer continues. This meal won't be logged."
                },
                {
                    "id": "end",
                    "title": "End my fast now",
                    "description": "Your fast will officially end. You can log your meal time."
                }
            ]
        }

@router.post("/{session_id}/handle-snack-decision")
async def handle_snack_decision(session_id: str, payload: SnackDecision, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        if payload.decision == "ignore":
            return {"id": session_id, "status": "active", "message": "Snack ignored, fast continues"}
            
        elif payload.decision in ["end", "restart"]:
            # FIX: Ensure the meal belongs to the authenticated user
            meal = await conn.fetchrow(
                "SELECT meal_time FROM meals WHERE id = $1 AND user_id = $2", 
                payload.meal_id, user_id
            )
            if not meal:
                raise HTTPException(status_code=404, detail="Meal record not found or not authorized")
				            
            aware_meal_time = meal['meal_time'].replace(tzinfo=timezone.utc)
            
            if payload.decision == "end":
                await conn.execute(
                    """
                    UPDATE fasting_sessions 
                    SET actual_fast_end_time = $1, 
                        actual_duration_hours = EXTRACT(EPOCH FROM ($1 - fast_start_time)) / 3600,
                        status = 'completed',
                        is_goal_met = (EXTRACT(EPOCH FROM ($1 - fast_start_time)) / 3600) >= target_duration_hours
                    WHERE id = $2 AND user_id = $3
                    """,
                    aware_meal_time, session_id, user_id
                )
                return {"id": session_id, "status": "completed", "message": "Fast ended at snack time"}
                
            elif payload.decision == "restart":
                await conn.execute(
                    """
                    UPDATE fasting_sessions 
                    SET last_meal_time = $1::timestamptz,
                        fast_start_time = $1::timestamptz,
                        planned_fast_end_time = $1::timestamptz + (target_duration_hours * INTERVAL '1 hour')
                    WHERE id = $2 AND user_id = $3
                    """,
                    aware_meal_time, session_id, user_id
                )
                return {"id": session_id, "status": "active", "last_meal_time": aware_meal_time, "message": "Fast restarted successfully"}        
        else:
            raise HTTPException(status_code=400, detail="Invalid decision")

# Append to routers/sessions.py

class SessionUpdate(BaseModel):
    last_meal_time: Optional[datetime] = None
    planned_fast_end_time: Optional[datetime] = None
    actual_fast_end_time: Optional[datetime] = None  # NEW
    notes: Optional[str] = None
    edit_reason: str

@router.patch("/{session_id}")
async def update_session(session_id: str, payload: SessionUpdate, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # 1. Fetch current session to calculate safe durations
        current = await conn.fetchrow("SELECT * FROM fasting_sessions WHERE id = $1 AND user_id = $2", session_id, user_id)
        if not current:
            raise HTTPException(status_code=404, detail="Session not found")

        # 2. Determine new timestamps
        new_start = payload.last_meal_time.replace(tzinfo=timezone.utc) if payload.last_meal_time else current['fast_start_time']
        new_end = payload.actual_fast_end_time.replace(tzinfo=timezone.utc) if payload.actual_fast_end_time else current['actual_fast_end_time']
        
        # 3. Build dynamic updates
        updates = []
        values = [session_id, user_id, payload.edit_reason]
        
        if payload.last_meal_time:
            values.append(new_start)
            updates.append(f"last_meal_time = ${len(values)}, fast_start_time = ${len(values)}")
            
        if payload.planned_fast_end_time:
            values.append(payload.planned_fast_end_time.replace(tzinfo=timezone.utc))
            updates.append(f"planned_fast_end_time = ${len(values)}")

        if payload.actual_fast_end_time:
            values.append(new_end)
            updates.append(f"actual_fast_end_time = ${len(values)}")
            
        if payload.notes:
            values.append(payload.notes)
            updates.append(f"notes = ${len(values)}")
            
        if not updates:
            raise HTTPException(status_code=400, detail="No fields provided to update")
            
        # 4. If start or actual end changed, recalculate the duration and goal status
        if payload.last_meal_time or payload.actual_fast_end_time:
            if new_end: # Only calculate if the fast actually has an end time
                duration_hours = (new_end - new_start).total_seconds() / 3600
                values.append(duration_hours)
                updates.append(f"actual_duration_hours = ${len(values)}")
                updates.append(f"is_goal_met = ${len(values)} >= target_duration_hours")

        updates.extend(["was_edited = true", "edit_reason = $3", "updated_at = CURRENT_TIMESTAMP"])
        
        query = f"""
            UPDATE fasting_sessions 
            SET {', '.join(updates)}
            WHERE id = $1 AND user_id = $2
            RETURNING *
        """
        row = await conn.fetchrow(query, *values)
        return dict(row)

@router.delete("/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        result = await conn.execute(
            "DELETE FROM fasting_sessions WHERE id = $1 AND user_id = $2",
            session_id, user_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Session not found or not authorized")
        return {"status": "success", "message": "Session deleted"}

class ManualSession(BaseModel):
    last_meal_time: datetime
    actual_fast_end_time: datetime
    target_duration_hours: float = 16.0
    notes: Optional[str] = None

@router.post("/manual")
async def log_manual_session(payload: ManualSession, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # Calculate duration
        start_utc = payload.last_meal_time.replace(tzinfo=timezone.utc)
        end_utc = payload.actual_fast_end_time.replace(tzinfo=timezone.utc)
        duration_hours = (end_utc - start_utc).total_seconds() / 3600

        query = """
            INSERT INTO fasting_sessions (
                user_id, session_date, last_meal_time, fast_start_time, 
                planned_fast_end_time, actual_fast_end_time, target_duration_hours, 
                actual_duration_hours, status, is_goal_met, notes
            ) VALUES (
                $1, $2, $3::timestamptz, $3::timestamptz, 
                $3::timestamptz + ($4::numeric * INTERVAL '1 hour'), $5::timestamptz,
                $4::numeric, $6, 'completed', $6 >= $4, $7
            ) RETURNING id
        """
        row = await conn.fetchrow(
            query, user_id, end_utc.date(), start_utc, 
            payload.target_duration_hours, end_utc, duration_hours, payload.notes
        )
        return dict(row)



@router.delete("/me/purge")
async def purge_user_data(user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Manually clear related tables to be safe before dropping the user
            await conn.execute("DELETE FROM meals WHERE user_id = $1", user_id)
            await conn.execute("DELETE FROM fasting_sessions WHERE user_id = $1", user_id)
            await conn.execute("DELETE FROM fasting_plans WHERE user_id = $1", user_id)
            await conn.execute("DELETE FROM notification_settings WHERE user_id = $1", user_id)
            
            await conn.execute("DELETE FROM users WHERE id = $1", user_id)
            
    return {"status": "success", "message": "All data permanently deleted"}