import os
import random
import resend
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from contextlib import asynccontextmanager

from database import get_db_connection
from security import hash_otp, create_access_token
from utils.scheduler import setup_scheduler, scheduler
from routers import sessions, meals, plans, analytics, settings

# 1. Configure external services
resend.api_key = os.getenv("RESEND_API_KEY")

# 2. Define Lifespan for Background Tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting background scheduler...")
    setup_scheduler()
    yield
    print("Shutting down background scheduler...")
    scheduler.shutdown()

# 3. Initialize the FastAPI App FIRST
app = FastAPI(title="FastTracker API", lifespan=lifespan)

# 4. Add Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Define Auth Schemas and Routes
class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
    timezone: str = "UTC" # Add this field

# Wrap auth in its own router
auth_router = APIRouter(prefix="/auth", tags=["Auth"])

@auth_router.post("/request-otp")
async def request_otp(payload: OTPRequest):
    otp = str(random.randint(100000, 999999))
    hashed_otp = hash_otp(otp)
    
    async with get_db_connection() as conn:
        await conn.execute(
            "INSERT INTO auth_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
            payload.email, hashed_otp
        )
    
    resend.Emails.send({
        "from": os.getenv("FROM_EMAIL", "onboarding@resend.dev"),
        "to": payload.email,
        "subject": "Your FastTracker Login Code",
        "html": f"<p>Your code is <strong>{otp}</strong>. It expires in 5 minutes.</p>"
    })
    return {"message": "OTP sent successfully"}

@auth_router.post("/verify-otp")
async def verify_otp(payload: OTPVerify):
    hashed_input = hash_otp(payload.otp)
    
    async with get_db_connection() as conn:
        record = await conn.fetchrow(
            "SELECT id FROM auth_otps WHERE email = $1 AND otp_hash = $2 AND expires_at > NOW()",
            payload.email, hashed_input
        )
        if not record:
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
            
        user = await conn.fetchrow("SELECT id FROM users WHERE email = $1", payload.email)
        if not user:
            user_id = await conn.fetchval(
                "INSERT INTO users (email, time_zone) VALUES ($1, $2) RETURNING id", 
                payload.email, payload.timezone
            )
        else:
            user_id = user['id']
            # Optionally update their timezone if they traveled
            await conn.execute("UPDATE users SET time_zone = $1 WHERE id = $2", payload.timezone, user_id)
        await conn.execute("DELETE FROM auth_otps WHERE email = $1", payload.email)
    token = create_access_token(data={"sub": str(user_id), "email": payload.email})
    return {"access_token": token, "token_type": "bearer"}

# 6. Include ALL Routers LAST (After 'app' is defined)
app.include_router(auth_router, prefix="/v1")      # <-- Auth is now under /v1
app.include_router(sessions.router, prefix="/v1")
app.include_router(meals.router, prefix="/v1")
app.include_router(plans.router, prefix="/v1")
app.include_router(analytics.router, prefix="/v1")
app.include_router(settings.router, prefix="/v1")