import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.auth.dependencies import get_current_user
from meterflow.auth.service import CurrentUser
from meterflow.database import get_db
from meterflow.repositories.co2_factor import Co2FactorRepository
from meterflow.schemas.co2_factor import Co2DefaultResponse, Co2FactorResponse, Co2FactorUpsert
from meterflow.services.co2 import get_defaults

router = APIRouter(prefix="/co2-factors", tags=["co2-factors"])


@router.get("/defaults", response_model=list[Co2DefaultResponse])
async def list_defaults() -> list[Co2DefaultResponse]:
    return get_defaults()


@router.get("/", response_model=list[Co2FactorResponse])
async def list_co2_factors(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Co2FactorResponse]:
    repo = Co2FactorRepository(db)
    factors = await repo.list_for_user(current_user.id)
    return [Co2FactorResponse.model_validate(f) for f in factors]


@router.put("/", response_model=Co2FactorResponse, status_code=status.HTTP_200_OK)
async def upsert_co2_factor(
    body: Co2FactorUpsert,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Co2FactorResponse:
    repo = Co2FactorRepository(db)
    factor = await repo.upsert(current_user.id, body)
    return Co2FactorResponse.model_validate(factor)


@router.delete("/{factor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_co2_factor(
    factor_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = Co2FactorRepository(db)
    deleted = await repo.delete_by_id(factor_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CO2 factor not found")
