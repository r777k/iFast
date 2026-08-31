from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
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
        # Prevent overlapping active sessions
        await conn.execute(
            "UPDATE fasting_sessions SET status = 'broken' WHERE user_id = $1 AND status = 'active'",
            user_id
        )
        
        query = """
            INSERT INTO fasting_sessions (
                user_id, session_date, last_meal_time, fast_start_time, 
                planned_fast_end_time, target_duration_hours, status, notes
            ) VALUES (
                $1, CURRENT_DATE, $2, $2, 
                $2 + ($3 * INTERVAL '1 hour'), $3, 'active', $4
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
        query = """
            UPDATE fasting_sessions 
            SET actual_fast_end_time = $1,
                actual_duration_hours = EXTRACT(EPOCH FROM ($1 - fast_start_time)) / 3600,
                status = 'completed',
                is_goal_met = (EXTRACT(EPOCH FROM ($1 - fast_start_time)) / 3600) >= target_duration_hours,
                notes = COALESCE($2, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND user_id = $4 AND status = 'active'
            RETURNING id, actual_fast_end_time, actual_duration_hours, status, is_goal_met
        """
        row = await conn.fetchrow(query, payload.actual_fast_end_time, payload.notes, session_id, user_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Active session not found or already completed")
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
            VALUES ($1, $2, $3, 'snack', $4, $5)
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
            
        elif payload.decision == "end":
            # Fetch the meal time to use as the end time
            meal = await conn.fetchrow("SELECT meal_time FROM meals WHERE id = $1", payload.meal_id)
            if not meal:
                raise HTTPException(status_code=404, detail="Meal record not found")
                
            await conn.execute(
                """
                UPDATE fasting_sessions 
                SET actual_fast_end_time = $1, 
                    actual_duration_hours = EXTRACT(EPOCH FROM ($1 - fast_start_time)) / 3600,
                    status = 'completed',
                    is_goal_met = (EXTRACT(EPOCH FROM ($1 - fast_start_time)) / 3600) >= target_duration_hours
                WHERE id = $2 AND user_id = $3
                """,
                meal['meal_time'], session_id, user_id
            )
            return {"id": session_id, "status": "completed", "message": "Fast ended at snack time"}
            
        elif payload.decision == "restart":
            meal = await conn.fetchrow("SELECT meal_time FROM meals WHERE id = $1", payload.meal_id)
            # Update the start time to the snack time, and push the planned end time out
            await conn.execute(
                """
                UPDATE fasting_sessions 
                SET last_meal_time = $1,
                    fast_start_time = $1,
                    planned_fast_end_time = $1 + (target_duration_hours * INTERVAL '1 hour')
                WHERE id = $2 AND user_id = $3
                """,
                meal['meal_time'], session_id, user_id
            )
            return {"id": session_id, "status": "active", "last_meal_time": meal['meal_time'], "message": "Fast restarted successfully"}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid decision")


# Append to routers/sessions.py

class SessionUpdate(BaseModel):
    last_meal_time: Optional[datetime] = None
    planned_fast_end_time: Optional[datetime] = None
    notes: Optional[str] = None
    edit_reason: str  # Required to build the audit trail

@router.patch("/{session_id}")
async def update_session(session_id: str, payload: SessionUpdate, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # Dynamically build the update query based on provided fields
        updates = []
        values = [session_id, user_id, payload.edit_reason]
        
        if payload.last_meal_time:
            values.append(payload.last_meal_time)
            updates.append(f"last_meal_time = ${len(values)}, fast_start_time = ${len(values)}")
            
        if payload.planned_fast_end_time:
            values.append(payload.planned_fast_end_time)
            updates.append(f"planned_fast_end_time = ${len(values)}")
            
        if payload.notes:
            values.append(payload.notes)
            updates.append(f"notes = ${len(values)}")
            
        if not updates:
            raise HTTPException(status_code=400, detail="No fields provided to update")
            
        updates.append("was_edited = true")
        updates.append("edit_reason = $3")
        updates.append("updated_at = CURRENT_TIMESTAMP")
        
        query = f"""
            UPDATE fasting_sessions 
            SET {', '.join(updates)}
            WHERE id = $1 AND user_id = $2
            RETURNING id, last_meal_time, planned_fast_end_time, notes, was_edited, edit_reason, updated_at
        """
        
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
            
        return dict(row)