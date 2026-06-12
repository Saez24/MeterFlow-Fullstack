import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from meterflow.auth.router import router as auth_router
from meterflow.config import settings
from meterflow.database import engine
from meterflow.routers.co2_factors import router as co2_router
from meterflow.routers.config import router as config_router
from meterflow.routers.import_export import router as import_router
from meterflow.routers.meters import router as meters_router
from meterflow.routers.readings import router as readings_router
from meterflow.routers.stats import router as stats_router

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("MeterFlow API starting up")
    yield
    await engine.dispose()
    logger.info("MeterFlow API shut down")


app = FastAPI(
    title="MeterFlow API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Cookie"],
)

_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=_PREFIX)
app.include_router(meters_router, prefix=_PREFIX)
app.include_router(readings_router, prefix=_PREFIX)
app.include_router(co2_router, prefix=_PREFIX)
app.include_router(stats_router, prefix=_PREFIX)
app.include_router(config_router, prefix=_PREFIX)
app.include_router(import_router, prefix=_PREFIX)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
