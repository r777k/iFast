from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db_connection
from dependencies import get_current_user

router = APIRouter(prefix="/meals", tags=["Meals"])

class MealCreate(BaseModel):
    fasting_session_id: str
    meal_time: datetime
    meal_type: Optional[str] = None # 'breakfast', 'lunch', 'dinner', 'snack'
    meal_size: Optional[str] = None # 'small', 'medium', 'large', 'none'
    description: Optional[str] = None
    notes: Optional[str] = None

@router.post("")
async def log_meal(payload: MealCreate, user_id: str = Depends(get_current_user)):
    # Preemptively fix the timezone mismatch!
    naive_meal_time = payload.meal_time.replace(tzinfo=None)
    async with get_db_connection() as conn:
        # First, ensure the targeted fasting session actually belongs to this user
        session = await conn.fetchrow(
            "SELECT id, status FROM fasting_sessions WHERE id = $1 AND user_id = $2", 
            payload.fasting_session_id, user_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Fasting session not found")

        # Insert the meal record
        query = """
            INSERT INTO meals (fasting_session_id, user_id, meal_time, meal_type, meal_size, description, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, meal_time, meal_type, meal_size, description
        """
        row = await conn.fetchrow(
            query, payload.fasting_session_id, user_id, naive_meal_time, 
            payload.meal_type, payload.meal_size, payload.description, payload.notes
        )
        return dict(row)