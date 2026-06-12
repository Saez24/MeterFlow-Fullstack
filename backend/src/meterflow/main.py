from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from meterflow.auth.router import router as auth_router
from meterflow.config import settings
from meterflow.database import engine
from meterflow.routers.co2_factors import router as co2_router
from meterflow.routers.config import router as config_router
from meterflow.routers.import_export import router as import_router
from meterflow.routers.meters import router as meters_router
from meterflow.routers.readings import router as readings_router
from meterflow.routers.stats import router as stats_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await engine.dispose()


app = FastAPI(
    title="MeterFlow API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
