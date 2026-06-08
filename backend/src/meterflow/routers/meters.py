import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.auth.dependencies import get_current_user
from meterflow.auth.service import CurrentUser
from meterflow.database import get_db
from meterflow.repositories.meter import MeterRepository
from meterflow.schemas.meter import MeterCreate, MeterResponse, MeterUpdate

router = APIRouter(prefix="/meters", tags=["meters"])


@router.get("/", response_model=list[MeterResponse])
async def list_meters(
    active: bool = False,
    type: str | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MeterResponse]:
    repo = MeterRepository(db)
    meters = await repo.list_for_user(current_user.id, active_only=active, energy_type=type)
    return [MeterResponse.model_validate(m) for m in meters]


@router.post("/", response_model=MeterResponse, status_code=status.HTTP_201_CREATED)
async def create_meter(
    body: MeterCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeterResponse:
    repo = MeterRepository(db)
    meter = await repo.create(current_user.id, body)
    return MeterResponse.model_validate(meter)


@router.get("/{meter_id}", response_model=MeterResponse)
async def get_meter(
    meter_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeterResponse:
    repo = MeterRepository(db)
    meter = await repo.get_by_id(meter_id, current_user.id)
    if meter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meter not found")
    return MeterResponse.model_validate(meter)


@router.patch("/{meter_id}", response_model=MeterResponse)
async def update_meter(
    meter_id: uuid.UUID,
    body: MeterUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeterResponse:
    repo = MeterRepository(db)
    meter = await repo.get_by_id(meter_id, current_user.id)
    if meter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meter not found")
    meter = await repo.update(meter, body)
    return MeterResponse.model_validate(meter)


@router.delete("/{meter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meter(
    meter_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = MeterRepository(db)
    meter = await repo.get_by_id(meter_id, current_user.id)
    if meter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meter not found")
    await repo.delete(meter)
