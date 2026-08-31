import os
import resend
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import get_db_connection

# Initialize the scheduler
scheduler = AsyncIOScheduler()

async def check_fasting_goals():
    """
    Scans for active fasts that have just reached their target end time
    and triggers an email if the user has notifications enabled.
    """
    async with get_db_connection() as conn:
        # Note: In a production environment, you should add a 'goal_notified' boolean 
        # to the fasting_sessions table to prevent duplicate emails.
        query = """
            SELECT fs.id, fs.user_id, u.email, u.first_name, fs.target_duration_hours
            FROM fasting_sessions fs
            JOIN users u ON fs.user_id = u.id
            JOIN notification_settings ns ON u.id = ns.user_id
            WHERE fs.status = 'active' 
              AND ns.notifications_enabled = true 
              AND ns.notify_when_target_reached = true
              AND fs.planned_fast_end_time <= CURRENT_TIMESTAMP
              -- AND fs.goal_notified = false (Recommended DB addition)
        """
        
        reached_goals = await conn.fetch(query)
        
        for record in reached_goals:
            # Dispatch email via Resend
            try:
                resend.Emails.send({
                    "from": os.getenv("FROM_EMAIL", "notifications@fasttracker.app"),
                    "to": record["email"],
                    "subject": "🎯 Fasting Goal Reached!",
                    "html": f"""
                        <h3>Great job, {record['first_name'] or 'there'}!</h3>
                        <p>You have successfully reached your {record['target_duration_hours']}-hour fasting goal.</p>
                        <p>Log in to end your fast and record your first meal.</p>
                    """
                })
                # If you add the boolean flag, execute an UPDATE here:
                # await conn.execute("UPDATE fasting_sessions SET goal_notified = true WHERE id = $1", record["id"])
            except Exception as e:
                print(f"Failed to send notification to {record['email']}: {e}")

def setup_scheduler():
    # Run the goal checker every 5 minutes
    scheduler.add_job(check_fasting_goals, 'interval', minutes=5, id='check_fasting_goals_job')
    scheduler.start()