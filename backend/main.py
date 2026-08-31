from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import random
import resend
from database import get_db_connection
from security import hash_otp, create_access_token
import os


from contextlib import asynccontextmanager
from utils.scheduler import setup_scheduler, scheduler

from routers import plans, analytics, settings, sessions, meals

app.include_router(plans.router, prefix="/v1")
app.include_router(analytics.router, prefix="/v1")
app.include_router(settings.router, prefix="/v1")
app.include_router(sessions.router, prefix="/v1")
app.include_router(meals.router, prefix="/v1")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the background worker
    print("Starting background scheduler...")
    setup_scheduler()
    yield
    # Shutdown: Cleanly shut down the worker
    print("Shutting down background scheduler...")
    scheduler.shutdown()

app = FastAPI(title="FastTracker API", lifespan=lifespan)

resend.api_key = os.getenv("RESEND_API_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

@app.post("/auth/request-otp")
async def request_otp(payload: OTPRequest):
    otp = str(random.randint(100000, 999999))
    hashed_otp = hash_otp(otp)
    
    async with get_db_connection() as conn:
        await conn.execute(
            "INSERT INTO auth_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
            payload.email, hashed_otp
        )
    
    # Dispatch email via Resend
    resend.Emails.send({
        "from": os.getenv("FROM_EMAIL", "onboarding@resend.dev"),
        "to": payload.email,
        "subject": "Your FastTracker Login Code",
        "html": f"<p>Your code is <strong>{otp}</strong>. It expires in 5 minutes.</p>"
    })
    return {"message": "OTP sent successfully"}

@app.post("/auth/verify-otp")
async def verify_otp(payload: OTPVerify):
    hashed_input = hash_otp(payload.otp)
    
    async with get_db_connection() as conn:
        # Check OTP validity
        record = await conn.fetchrow(
            "SELECT id FROM auth_otps WHERE email = $1 AND otp_hash = $2 AND expires_at > NOW()",
            payload.email, hashed_input
        )
        if not record:
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
            
        # Ensure user exists
        user = await conn.fetchrow("SELECT id FROM users WHERE email = $1", payload.email)
        if not user:
            user_id = await conn.fetchval(
                "INSERT INTO users (email) VALUES ($1) RETURNING id", payload.email
            )
        else:
            user_id = user['id']
            
        # Clean up used OTPs
        await conn.execute("DELETE FROM auth_otps WHERE email = $1", payload.email)
        
    token = create_access_token(data={"sub": str(user_id), "email": payload.email})
    return {"access_token": token, "token_type": "bearer"}