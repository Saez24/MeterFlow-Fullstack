import uuid
from decimal import Decimal

from pydantic import BaseModel


class MeterMonthStats(BaseModel):
    consumption: Decimal
    cost: Decimal
    unit: str


class MonthStats(BaseModel):
    year: int
    month: int
    label: str
    by_meter: dict[str, MeterMonthStats]
    total_cost: Decimal


class MeterYearStats(BaseModel):
    consumption: Decimal
    cost: Decimal


class YearStats(BaseModel):
    year: int
    total_cost: Decimal
    by_meter: dict[str, MeterYearStats]
    months: list[MonthStats]


class BudgetAlert(BaseModel):
    meter_id: uuid.UUID
    meter_name: str
    type: str  # monthly_cost | yearly_cost | consumption
    current: Decimal
    limit: Decimal
    percent: Decimal
    unit: str
    color: str
    critical: bool


class DashboardStats(BaseModel):
    current_month_cost: Decimal
    current_year_cost: Decimal
    current_month_co2_kg: Decimal
    budget_alerts: list[BudgetAlert]
    year_over_year_percent: Decimal | None
    year_over_year_prev_year: int | None
