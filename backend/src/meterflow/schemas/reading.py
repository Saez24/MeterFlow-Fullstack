import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class ReadingCreate(BaseModel):
    meter_id: uuid.UUID
    date: date
    value: Decimal
    note: str | None = None


class ReadingUpdate(BaseModel):
    date: date | None = None
    value: Decimal | None = None
    note: str | None = None


class ReadingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    meter_id: uuid.UUID
    date: date
    value: Decimal
    consumption: Decimal | None
    kwh: Decimal | None
    cost: Decimal | None
    wastewater_cost: Decimal | None
    total_cost: Decimal | None
    note: str | None
    photo: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
