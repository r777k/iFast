import asyncpg
import os
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv("DATABASE_URL")

@asynccontextmanager
async def get_db_connection():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()