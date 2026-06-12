from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.auth.dependencies import get_current_user
from meterflow.auth.service import CurrentUser
from meterflow.database import get_db
from meterflow.repositories.meter import MeterRepository
from meterflow.repositories.reading import ReadingRepository
from meterflow.schemas.reading import ReadingCreate, ReadingResponse, ReadingUpdate
from meterflow.services.reading import compute_reading, recalculate_readings

router = APIRouter(prefix="/readings", tags=["readings"])


@router.get("/", response_model=list[ReadingResponse])
async def list_readings(
    meter_id: uuid.UUID | None = None,
    year: int | None = None,
    limit: int = 1000,
    cursor: date | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReadingResponse]:
    repo = ReadingRepository(db)
    if meter_id is not None:
        readings = await repo.list_for_meter(meter_id, current_user.id, year=year, limit=limit, cursor=cursor)
    else:
        readings = await repo.list_all(current_user.id, limit=limit)
    return [ReadingResponse.model_validate(r) for r in readings]


@router.post("/", response_model=ReadingResponse, status_code=status.HTTP_201_CREATED)
async def create_reading(
    body: ReadingCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadingResponse:
    meter_repo = MeterRepository(db)
    meter = await meter_repo.get_by_id(body.meter_id, current_user.id)
    if meter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meter not found")

    reading_repo = ReadingRepository(db)
    prev = await reading_repo.get_previous(body.meter_id, body.date)

    computed = compute_reading(
        meter=meter,
        previous_value=Decimal(str(prev.value)) if prev else None,
        new_value=body.value,
        new_date=body.date,
        previous_date=prev.date if prev else None,
    )

    reading = await reading_repo.create(current_user.id, body)
    reading.consumption = computed.consumption
    reading.kwh = computed.kwh
    reading.cost = computed.cost
    reading.wastewater_cost = computed.wastewater_cost
    reading.total_cost = computed.total_cost
    await db.commit()
    await db.refresh(reading)
    return ReadingResponse.model_validate(reading)


@router.get("/{reading_id}", response_model=ReadingResponse)
async def get_reading(
    reading_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadingResponse:
    repo = ReadingRepository(db)
    reading = await repo.get_by_id(reading_id, current_user.id)
    if reading is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")
    return ReadingResponse.model_validate(reading)


@router.patch("/{reading_id}", response_model=ReadingResponse)
async def update_reading(
    reading_id: uuid.UUID,
    body: ReadingUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadingResponse:
    repo = ReadingRepository(db)
    reading = await repo.get_by_id(reading_id, current_user.id)
    if reading is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")
    reading = await repo.update(reading, body)
    return ReadingResponse.model_validate(reading)


@router.delete("/{reading_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reading(
    reading_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = ReadingRepository(db)
    reading = await repo.get_by_id(reading_id, current_user.id)
    if reading is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")
    await repo.delete(reading)


@router.post("/recalculate/{meter_id}", response_model=list[ReadingResponse])
async def recalculate(
    meter_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReadingResponse]:
    meter_repo = MeterRepository(db)
    meter = await meter_repo.get_by_id(meter_id, current_user.id)
    if meter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meter not found")

    reading_repo = ReadingRepository(db)
    all_readings = await reading_repo.list_for_meter(meter_id, current_user.id, limit=10000)
    updated = recalculate_readings(meter, all_readings)
    await reading_repo.bulk_update_computed(updated)
    return [ReadingResponse.model_validate(r) for r in updated]
