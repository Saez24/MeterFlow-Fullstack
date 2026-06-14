from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class Co2FactorUpsert(BaseModel):
    energy_type: str
    factor_kg_per_unit: Decimal
    unit: str
    source: str = ""
    source_url: str | None = None
    valid_from: date


class Co2FactorResponse(BaseModel):
    id: uuid.UUID
    energy_type: str
    factor_kg_per_unit: Decimal
    unit: str
    source: str
    source_url: str | None
    valid_from: date
    created_at: datetime

    model_config = {"from_attributes": True}


class Co2DefaultResponse(BaseModel):
    energy_type: str
    factor_kg_per_unit: float
    unit: str
    source: str
