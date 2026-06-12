from fastapi import APIRouter
from pydantic import BaseModel

from meterflow.config import settings

router = APIRouter(prefix="/config", tags=["config"])


class ConfigResponse(BaseModel):
    storage_backend: str
    storage_enabled: bool
    auth_provider: str
    database: str
    version: str


@router.get("/", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    return ConfigResponse(
        storage_backend=settings.storage_backend,
        storage_enabled=settings.storage_backend != "none",
        auth_provider="jwt_cookie",
        database="postgresql",
        version="0.1.0",
    )
