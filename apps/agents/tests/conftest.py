import pytest
import httpx


@pytest.fixture(autouse=True)
async def reset_db_pool():
    """Close the asyncpg connection pool after each test.

    pytest-asyncio creates a fresh event loop per test function.
    The global pool in app.db is bound to the event loop that created it,
    so it must be torn down before the next test spins up a new loop.
    """
    yield
    from app.db import close_pool

    await close_pool()


@pytest.fixture
async def client():
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test", follow_redirects=True
    ) as c:
        yield c
