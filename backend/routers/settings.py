from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_db_connection
from dependencies import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])

class RulesUpdate(BaseModel):
    min_duration_to_count_hours: float
    snack_behavior: str
    allow_edit_past_meals: bool

class NotificationsUpdate(BaseModel):
    notifications_enabled: bool
    remind_before_eating_window_end: bool
    remind_before_minutes: int
    light_checkins_enabled: bool

@router.get("/fasting-rules")
async def get_rules(user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        row = await conn.fetchrow("SELECT * FROM fasting_rules WHERE user_id = $1", user_id)
        if not row:
            # Auto-provision default rules if they don't exist yet
            row = await conn.fetchrow(
                "INSERT INTO fasting_rules (user_id) VALUES ($1) RETURNING *", user_id
            )
        return dict(row)

@router.patch("/fasting-rules")
async def update_rules(payload: RulesUpdate, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        row = await conn.fetchrow("""
            UPDATE fasting_rules 
            SET min_duration_to_count_hours = $1, snack_behavior = $2, 
                allow_edit_past_meals = $3, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $4 RETURNING *
        """, payload.min_duration_to_count_hours, payload.snack_behavior, payload.allow_edit_past_meals, user_id)
        return dict(row)

@router.get("/notifications")
async def get_notifications(user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        row = await conn.fetchrow("SELECT * FROM notification_settings WHERE user_id = $1", user_id)
        if not row:
            row = await conn.fetchrow(
                "INSERT INTO notification_settings (user_id) VALUES ($1) RETURNING *", user_id
            )
        return dict(row)

@router.patch("/notifications")
async def update_notifications(payload: NotificationsUpdate, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        row = await conn.fetchrow("""
            UPDATE notification_settings 
            SET notifications_enabled = $1, remind_before_eating_window_end = $2, 
                remind_before_minutes = $3, light_checkins_enabled = $4, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $5 RETURNING *
        """, payload.notifications_enabled, payload.remind_before_eating_window_end, 
            payload.remind_before_minutes, payload.light_checkins_enabled, user_id)
        return dict(row)