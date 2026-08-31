from fastapi import APIRouter, Depends
from database import get_db_connection
from dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard(user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # 1. Get current active session
        current_session = await conn.fetchrow(
            "SELECT * FROM current_fasting_sessions WHERE user_id = $1 LIMIT 1", user_id
        )
        
        # 2. Get today's stats
        today_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_fasts,
                COUNT(*) FILTER (WHERE is_goal_met) as completed_fasts,
                COALESCE(AVG(actual_duration_hours), 0) as average_duration,
                BOOL_OR(is_goal_met) as goal_met
            FROM fasting_sessions 
            WHERE user_id = $1 AND session_date = CURRENT_DATE
        """, user_id)

        # 3. Get monthly stats (utilizing the view)
        month_stats = await conn.fetchrow("""
            SELECT * FROM monthly_fasting_stats 
            WHERE user_id = $1 AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE
        """, user_id)

        return {
            "current_session": dict(current_session) if current_session else None,
            "today_stats": dict(today_stats) if today_stats else {},
            "month_stats": dict(month_stats) if month_stats else {}
        }

from datetime import date
from typing import Optional

@router.get("/weekly")
async def get_weekly_analytics(start_date: date, end_date: date, user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # 1. Fetch aggregate metrics for the week
        metrics_query = """
            SELECT 
                COUNT(*) as total_fasts,
                COUNT(*) FILTER (WHERE is_goal_met) as completed_fasts,
                COALESCE(AVG(actual_duration_hours), 0) as average_duration_hours,
                COALESCE(MAX(actual_duration_hours), 0) as longest_duration_hours
            FROM fasting_sessions
            WHERE user_id = $1 AND session_date >= $2 AND session_date <= $3 AND status = 'completed'
        """
        metrics = await conn.fetchrow(metrics_query, user_id, start_date, end_date)
        
        # 2. Fetch daily breakdown
        breakdown_query = """
            SELECT id as session_id, session_date as date, actual_duration_hours as duration_hours, is_goal_met
            FROM fasting_sessions
            WHERE user_id = $1 AND session_date >= $2 AND session_date <= $3 AND status = 'completed'
            ORDER BY session_date ASC
        """
        daily_breakdown = await conn.fetch(breakdown_query, user_id, start_date, end_date)
        
        total_fasts = metrics['total_fasts'] or 0
        goal_met_percentage = (metrics['completed_fasts'] / total_fasts * 100) if total_fasts > 0 else 0

        return {
            "period": {"start_date": start_date, "end_date": end_date},
            "metrics": {
                "total_fasts": total_fasts,
                "completed_fasts": metrics['completed_fasts'] or 0,
                "average_duration_hours": round(metrics['average_duration_hours'], 2),
                "longest_duration_hours": round(metrics['longest_duration_hours'], 2),
                "goal_met_percentage": round(goal_met_percentage, 1)
            },
            "daily_breakdown": [dict(day) for day in daily_breakdown]
        }

@router.get("/monthly")
async def get_monthly_analytics(month: str, user_id: str = Depends(get_current_user)):
    # Expected format for month: "YYYY-MM"
    async with get_db_connection() as conn:
        # Utilizing the system view created during DB initialization
        target_date = f"{month}-01"
        metrics_query = """
            SELECT total_sessions as total_fasts, completed_sessions as completed_fasts,
                   COALESCE(avg_duration, 0) as average_duration_hours, 
                   COALESCE(longest_duration, 0) as longest_duration_hours
            FROM monthly_fasting_stats 
            WHERE user_id = $1 AND month = $2::DATE
        """
        metrics = await conn.fetchrow(metrics_query, user_id, target_date)
        
        # Calculate current streak (consecutive days with goal met)
        streak_query = """
            WITH streak_calc AS (
                SELECT session_date,
                       session_date - ROW_NUMBER() OVER (ORDER BY session_date) * INTERVAL '1 day' AS grp
                FROM fasting_sessions
                WHERE user_id = $1 AND is_goal_met = true AND session_date <= CURRENT_DATE
            )
            SELECT COUNT(*) as streak
            FROM streak_calc
            WHERE grp = (SELECT grp FROM streak_calc ORDER BY session_date DESC LIMIT 1)
        """
        streak_row = await conn.fetchrow(streak_query, user_id)
        current_streak = streak_row['streak'] if streak_row else 0

        daily_query = """
            SELECT id as session_id, session_date as date, actual_duration_hours as duration_hours, is_goal_met
            FROM fasting_sessions
            WHERE user_id = $1 AND TO_CHAR(session_date, 'YYYY-MM') = $2 AND status = 'completed'
            ORDER BY session_date ASC
        """
        daily_summary = await conn.fetch(daily_query, user_id, month)

        if not metrics:
            return {"period": {"month": month}, "metrics": {}, "daily_summary": []}

        total_fasts = metrics['total_fasts']
        goal_met_percentage = (metrics['completed_fasts'] / total_fasts * 100) if total_fasts > 0 else 0

        return {
            "period": {"month": month},
            "metrics": {
                **dict(metrics),
                "current_streak": current_streak,
                "goal_met_percentage": round(goal_met_percentage, 1),
                "average_duration_hours": round(metrics['average_duration_hours'], 2)
            },
            "daily_summary": [dict(day) for day in daily_summary]
        }

@router.get("/patterns")
async def get_fasting_patterns(user_id: str = Depends(get_current_user)):
    async with get_db_connection() as conn:
        # Extract distributions using PostgreSQL date/time functions
        last_meal_query = """
            SELECT EXTRACT(HOUR FROM last_meal_time) as hour, COUNT(*) as count
            FROM fasting_sessions
            WHERE user_id = $1 AND status = 'completed'
            GROUP BY hour
            ORDER BY count DESC
        """
        last_meals = await conn.fetch(last_meal_query, user_id)
        
        break_fast_query = """
            SELECT EXTRACT(HOUR FROM actual_fast_end_time) as hour, COUNT(*) as count
            FROM fasting_sessions
            WHERE user_id = $1 AND status = 'completed'
            GROUP BY hour
            ORDER BY count DESC
        """
        break_fasts = await conn.fetch(break_fast_query, user_id)

        # Helper to format distributions
        def format_distribution(records):
            total = sum(r['count'] for r in records)
            return [
                {"hour": int(r['hour']), "count": r['count'], "percentage": round((r['count'] / total) * 100, 1)}
                for r in records
            ]

        last_meal_dist = format_distribution(last_meals)
        break_fast_dist = format_distribution(break_fasts)

        return {
            "last_meal_times": {
                "distribution": last_meal_dist,
                "most_common_hour": last_meal_dist[0]['hour'] if last_meal_dist else None,
                "most_common_time": f"{last_meal_dist[0]['hour']:02d}:00" if last_meal_dist else None
            },
            "break_fast_times": {
                "distribution": break_fast_dist,
                "most_common_hour": break_fast_dist[0]['hour'] if break_fast_dist else None,
                "most_common_time": f"{break_fast_dist[0]['hour']:02d}:00" if break_fast_dist else None
            }
        }