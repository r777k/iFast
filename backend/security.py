import hashlib
from datetime import datetime, timedelta
from jose import jwt
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"

def hash_otp(otp: str) -> str:
    """Creates a SHA-256 blind hash of the OTP."""
    return hashlib.sha256(otp.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=30)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)