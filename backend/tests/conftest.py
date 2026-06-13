import asyncio
import os
from collections.abc import AsyncGenerator, Generator
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from meterflow.database import get_db
from meterflow.limiter import limiter
from meterflow.main import app
from meterflow.models.base import Base

TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://meterflow:meterflow@localhost:5432/meterflow_test",
)

_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)


@pytest.fixture(autouse=True)
def disable_rate_limits() -> Generator[None, None, None]:
    async def _noop(request: Any, *args: Any, **kwargs: Any) -> None:
        request.state.view_rate_limit = None

    with patch.object(limiter, "_check_request_limit", AsyncMock(side_effect=_noop)):
        yield


@pytest.fixture(scope="session", autouse=True)
def setup_database() -> None:
    async def _setup() -> None:
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    async def _teardown() -> None:
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await _engine.dispose()

    asyncio.run(_setup())
    yield
    asyncio.run(_teardown())


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession]:
    async with _engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(
            bind=conn,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        yield session
        await session.close()
        await conn.rollback()


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient]:
    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
