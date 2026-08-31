from datetime import datetime
import asyncpg
from typing import Optional

async def resolve_daily_plan(conn: asyncpg.Connection, user_id: str, target_date: Optional[datetime.date] = None) -> dict:
    if target_date is None:
        target_date = datetime.now().date()
    
    # Map Python's isoweekday (Mon=1, Sun=7) to Postgres DOW (Sun=0, Sat=6)
    day_of_week = target_date.isoweekday() % 7 

    # 1. Attempt to fetch a specific override for today's day of the week
    schedule_query = """
        SELECT fast_start_time, fast_end_time, target_duration_hours 
        FROM fasting_plan_schedules 
        WHERE user_id = $1 AND day_of_week = $2
    """
    plan = await conn.fetchrow(schedule_query, user_id, day_of_week)
    
    if not plan:
        # 2. Fall back to the user's global default plan
        default_query = """
            SELECT fast_start_time, fast_end_time, target_duration_hours 
            FROM fasting_plans 
            WHERE user_id = $1 AND is_default = true
        """
        plan = await conn.fetchrow(default_query, user_id)
        
    if not plan:
        # 3. Ultimate fallback if the user has no configuration yet
        return {
            "fast_start_time": "20:00:00",
            "fast_end_time": "12:00:00",
            "target_duration_hours": 16.0
        }
        
    return dict(plan)