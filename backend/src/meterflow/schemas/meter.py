from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class TariffPeriodSchema(BaseModel):
    id: str
    valid_from: str
    valid_to: str | None = None
    price_per_unit: Decimal
    base_charge: Decimal
    wastewater_price: Decimal | None = None
    calorific_value: Decimal | None = None
    z_number: Decimal | None = None
    note: str | None = None
    emission_price: Decimal | None = None
    base_price_per_kw: Decimal | None = None
    annual_base_price: Decimal | None = None
    capacity_threshold_kw: Decimal | None = None


class BudgetConfigSchema(BaseModel):
    monthly_limit: Decimal | None = None
    yearly_limit: Decimal | None = None
    consumption_limit: Decimal | None = None
    alert_at: Decimal


class MeterCreate(BaseModel):
    name: str
    type: str
    unit: str
    icon: str
    color: str
    meter_number: str | None = None
    provider: str | None = None
    notes: str | None = None
    calorific_value: Decimal | None = None
    z_number: Decimal | None = None
    connected_load_kw: Decimal | None = None
    linked_water_meter_id: uuid.UUID | None = None
    tariff_history: list[dict] = []
    budget: dict | None = None


class MeterUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    unit: str | None = None
    icon: str | None = None
    color: str | None = None
    active: bool | None = None
    archived: bool | None = None
    meter_number: str | None = None
    provider: str | None = None
    notes: str | None = None
    calorific_value: Decimal | None = None
    z_number: Decimal | None = None
    connected_load_kw: Decimal | None = None
    linked_water_meter_id: uuid.UUID | None = None
    tariff_history: list[dict] | None = None
    budget: dict | None = None


class MeterResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: str
    unit: str
    icon: str
    color: str
    active: bool
    archived: bool
    meter_number: str | None
    provider: str | None
    notes: str | None
    calorific_value: Decimal | None
    z_number: Decimal | None
    connected_load_kw: Decimal | None
    linked_water_meter_id: uuid.UUID | None
    tariff_history: list[dict]
    budget: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
