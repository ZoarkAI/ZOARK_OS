import asyncpg
from contextlib import asynccontextmanager

from app.config import get_settings

DATABASE_URL = get_settings().database_url

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    return _pool


@asynccontextmanager
async def get_conn():
    pool = await get_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
