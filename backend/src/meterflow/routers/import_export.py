from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.auth.dependencies import get_current_user
from meterflow.auth.service import CurrentUser
from meterflow.database import get_db
from meterflow.models.meter import Meter
from meterflow.models.reading import Reading

router = APIRouter(prefix="/import", tags=["import"])


class ImportReading(BaseModel):
    id: uuid.UUID | None = None
    meterId: str
    value: Decimal
    date: str
    consumption: Decimal | None = None
    kwh: Decimal | None = None
    cost: Decimal | None = None
    wastewaterCost: Decimal | None = None
    totalCost: Decimal | None = None
    note: str | None = None
    photo: str | None = None


class ImportMeter(BaseModel):
    id: uuid.UUID | None = None
    name: str
    type: str
    unit: str
    icon: str
    color: str
    active: bool = True
    meterNumber: str | None = None
    provider: str | None = None
    notes: str | None = None
    calorificValue: float | None = None
    zNumber: float | None = None
    connectedLoadKw: float | None = None
    linkedWaterMeterId: str | None = None
    tariffHistory: list[dict] = []
    budget: dict | None = None


class ImportPayload(BaseModel):
    meters: list[ImportMeter] = []
    readings: list[ImportReading] = []


class ImportResult(BaseModel):
    meters_added: int
    meters_skipped: int
    readings_added: int
    readings_skipped: int


def _fix_encoding(s: str) -> str:
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def _parse_date(date_str: str):
    return datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()


@router.post("/", response_model=ImportResult, status_code=status.HTTP_200_OK)
async def import_data(
    payload: ImportPayload,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportResult:
    user_id = current_user.id
    meters_added = 0
    meters_skipped = 0

    # Meter-ID-Mapping: original ID → neue DB-ID (falls keine ID mitgeliefert)
    meter_id_map: dict[str, uuid.UUID] = {}

    for m in payload.meters:
        original_id = str(m.id) if m.id else None
        db_id = m.id or uuid.uuid4()

        existing = await db.get(Meter, db_id)
        if existing:
            if original_id:
                meter_id_map[original_id] = db_id
            meters_skipped += 1
            continue

        meter = Meter(
            id=db_id,
            user_id=user_id,
            name=m.name,
            type=m.type,
            unit=_fix_encoding(m.unit),
            icon=m.icon,
            color=m.color,
            active=m.active,
            archived=False,
            meter_number=m.meterNumber,
            provider=m.provider,
            notes=m.notes,
            calorific_value=m.calorificValue,
            z_number=m.zNumber,
            connected_load_kw=m.connectedLoadKw,
            linked_water_meter_id=(
                uuid.UUID(m.linkedWaterMeterId) if m.linkedWaterMeterId else None
            ),
            tariff_history=m.tariffHistory,
            budget=m.budget,
        )
        db.add(meter)
        if original_id:
            meter_id_map[original_id] = db_id
        meters_added += 1

    await db.flush()

    readings_added = 0
    readings_skipped = 0

    for r in payload.readings:
        db_id = r.id or uuid.uuid4()
        existing = await db.get(Reading, db_id)
        if existing:
            readings_skipped += 1
            continue

        # Meter-ID auflösen (via Mapping oder direkt)
        meter_uuid_str = r.meterId
        if meter_uuid_str in meter_id_map:
            meter_id = meter_id_map[meter_uuid_str]
        else:
            try:
                meter_id = uuid.UUID(meter_uuid_str)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ungültige meter_id: {meter_uuid_str}",
                )

        reading = Reading(
            id=db_id,
            user_id=user_id,
            meter_id=meter_id,
            date=_parse_date(r.date),
            value=r.value,
            consumption=r.consumption,
            kwh=r.kwh,
            cost=r.cost,
            wastewater_cost=r.wastewaterCost,
            total_cost=r.totalCost,
            note=r.note or None,
            photo=r.photo,
        )
        db.add(reading)
        readings_added += 1

    await db.commit()

    return ImportResult(
        meters_added=meters_added,
        meters_skipped=meters_skipped,
        readings_added=readings_added,
        readings_skipped=readings_skipped,
    )
