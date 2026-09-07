from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db_connection
from dependencies import get_current_user

router = APIRouter(prefix="/meals", tags=["Meals"])

class MealCreate(BaseModel):
    # Made optional so the dashboard can auto-target the active session
    fasting_session_id: Optional[str] = None 
    meal_time: datetime
    meal_type: Optional[str] = None # 'breakfast', 'lunch', 'dinner', 'snack', 'interruption'
    meal_size: Optional[str] = None # 'small', 'medium', 'large', 'none'
    description: Optional[str] = None
    notes: Optional[str] = None

@router.post("")
async def log_meal(payload: MealCreate, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        target_session_id = payload.fasting_session_id
        fast_broken = False
        
        # 1. Auto-detect active session if no ID was provided in the payload
        if not target_session_id:
            active_session = await conn.fetchrow(
                "SELECT id FROM fasting_sessions WHERE user_id = $1 AND status = 'active'",
                user_id
            )
            if active_session:
                target_session_id = active_session['id']
                
        # 2. If a session is targeted (either manually provided or auto-detected), verify and update it
        if target_session_id:
            session = await conn.fetchrow(
                "SELECT id, status, fast_start_time FROM fasting_sessions WHERE id = $1 AND user_id = $2", 
                target_session_id, user_id
            )
            
            if not session:
                raise HTTPException(status_code=404, detail="Fasting session not found")
            
            # If the session is currently active, interrupt it
            if session['status'] == 'active':
                break_fast_query = """
                    UPDATE fasting_sessions
                    SET status = 'broken',
                        actual_fast_end_time = $3::timestamptz,
                        actual_duration_hours = EXTRACT(EPOCH FROM ($3::timestamptz - fast_start_time)) / 3600,
                        is_goal_met = false,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1 AND user_id = $2
                """
                # FIX: Added target_session_id AND user_id parameters
                await conn.execute(break_fast_query, target_session_id, user_id, payload.meal_time)
                fast_broken = True

        # 3. Insert the meal record using timezone-aware casting (::timestamptz)
        query = """
            INSERT INTO meals (fasting_session_id, user_id, meal_time, meal_type, meal_size, description, notes)
            VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7)
            RETURNING id, meal_time, meal_type, meal_size, description, notes
        """
        row = await conn.fetchrow(
            query, target_session_id, user_id, payload.meal_time, 
            payload.meal_type, payload.meal_size, payload.description, payload.notes
        )
        
        result = dict(row)
        result["fast_broken"] = fast_broken
        return result