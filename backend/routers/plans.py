from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import time
from database import get_db_connection
from dependencies import get_current_user

router = APIRouter(prefix="/fasting-plans", tags=["Fasting Plans"])

class PlanCreate(BaseModel):
    name: str
    fast_start_time: time
    fast_end_time: time
    target_duration_hours: float
    is_default: bool = False
    is_daily: bool = True

@router.get("")
async def get_plans(user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            "SELECT * FROM fasting_plans WHERE user_id = $1 ORDER BY created_at DESC", 
            user_id
        )
        return {"plans": [dict(row) for row in rows]}

@router.post("")
async def create_plan(payload: PlanCreate, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # If this is set to default, unset others first
        if payload.is_default:
            await conn.execute("UPDATE fasting_plans SET is_default = false WHERE user_id = $1", user_id)
            
        query = """
            INSERT INTO fasting_plans (user_id, name, fast_start_time, fast_end_time, target_duration_hours, is_default, is_daily)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        """
        row = await conn.fetchrow(
            query, user_id, payload.name, payload.fast_start_time, payload.fast_end_time, 
            payload.target_duration_hours, payload.is_default, payload.is_daily
        )
        return dict(row)

@router.patch("/{plan_id}/set-default")
async def set_default_plan(plan_id: str, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        async with conn.transaction():
            await conn.execute("UPDATE fasting_plans SET is_default = false WHERE user_id = $1", user_id)
            row = await conn.fetchrow(
                "UPDATE fasting_plans SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *",
                plan_id, user_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Plan not found")
            return dict(row)