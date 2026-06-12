from fastapi import APIRouter, Depends
from pydantic import BaseModel

from meterflow.auth.dependencies import get_current_user
from meterflow.auth.service import CurrentUser
from meterflow.config import settings

router = APIRouter(prefix="/config", tags=["config"])


class ConfigResponse(BaseModel):
    storage_backend: str
    storage_enabled: bool
    auth_provider: str
    database: str
    version: str


@router.get("/", response_model=ConfigResponse)
async def get_config(
    _: CurrentUser = Depends(get_current_user),
) -> ConfigResponse:
    return ConfigResponse(
        storage_backend=settings.storage_backend,
        storage_enabled=settings.storage_backend != "none",
        auth_provider="jwt_cookie",
        database="postgresql",
        version="0.1.0",
    )
