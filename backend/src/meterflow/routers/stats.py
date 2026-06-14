from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.auth.dependencies import get_current_user
from meterflow.auth.service import CurrentUser
from meterflow.database import get_db
from meterflow.repositories.co2_factor import Co2FactorRepository
from meterflow.repositories.meter import MeterRepository
from meterflow.repositories.reading import ReadingRepository
from meterflow.schemas.stats import BudgetAlert, DashboardStats, YearStats
from meterflow.services.budget import get_budget_alerts
from meterflow.services.co2 import calculate_co2
from meterflow.services.stats import build_year_stats, year_over_year_diff

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/year/{year}", response_model=YearStats)
async def get_year_stats(
    year: int = Path(ge=1900, le=2100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> YearStats:
    meter_repo = MeterRepository(db)
    reading_repo = ReadingRepository(db)
    meters = await meter_repo.list_for_user(current_user.id)
    readings = await reading_repo.list_for_user_year(current_user.id, year)
    meter_map = {str(m.id): m for m in meters}
    return build_year_stats(year, readings, meter_map)


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardStats:
    today = date.today()
    year = today.year
    month = today.month

    meter_repo = MeterRepository(db)
    reading_repo = ReadingRepository(db)
    co2_repo = Co2FactorRepository(db)

    meters = await meter_repo.list_for_user(current_user.id, active_only=True)
    readings_this_year = await reading_repo.list_for_user_year(current_user.id, year)
    readings_prev_year = await reading_repo.list_for_user_year(current_user.id, year - 1)
    user_co2_factors = await co2_repo.list_for_user(current_user.id)

    meter_map = {str(m.id): m for m in meters}
    stats_this = build_year_stats(year, readings_this_year, meter_map)
    stats_prev = build_year_stats(year - 1, readings_prev_year, meter_map)

    current_month = next((m for m in stats_this.months if m.month == month), None)
    current_month_cost = current_month.total_cost if current_month else Decimal("0")

    current_month_co2 = Decimal("0")
    if current_month:
        for meter_id_str, ms in current_month.by_meter.items():
            meter = meter_map.get(meter_id_str)
            if meter:
                current_month_co2 += calculate_co2(meter.type, ms.consumption, user_co2_factors)

    alerts: list[BudgetAlert] = []
    if current_month:
        alerts = get_budget_alerts(meters, current_month)

    yoy = year_over_year_diff(stats_this, stats_prev)

    return DashboardStats(
        current_month_cost=current_month_cost,
        current_year_cost=stats_this.total_cost,
        current_month_co2_kg=current_month_co2,
        budget_alerts=alerts,
        year_over_year_percent=yoy[0] if yoy else None,
        year_over_year_prev_year=yoy[1] if yoy else None,
    )


@router.get("/budget-alerts", response_model=list[BudgetAlert])
async def get_budget_alert_list(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BudgetAlert]:
    today = date.today()
    meter_repo = MeterRepository(db)
    reading_repo = ReadingRepository(db)
    meters = await meter_repo.list_for_user(current_user.id, active_only=True)
    readings = await reading_repo.list_for_user_year(current_user.id, today.year)
    meter_map = {str(m.id): m for m in meters}
    stats = build_year_stats(today.year, readings, meter_map)
    current_month = next((m for m in stats.months if m.month == today.month), None)
    if current_month is None:
        return []
    return get_budget_alerts(meters, current_month)
