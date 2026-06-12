from collections import defaultdict
from decimal import Decimal

from meterflow.models.meter import Meter
from meterflow.models.reading import Reading
from meterflow.schemas.stats import MeterMonthStats, MeterYearStats, MonthStats, YearStats

_MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]


def build_year_stats(year: int, readings: list[Reading], meters: dict[str, Meter]) -> YearStats:
    """Process all readings for a year into YearStats. Runs in Python to avoid N+1."""
    monthly: dict[int, dict[str, MeterMonthStats]] = defaultdict(dict)
    by_meter: dict[str, MeterYearStats] = {}

    for reading in readings:
        if reading.total_cost is None:
            continue
        meter_id = str(reading.meter_id)
        meter = meters.get(meter_id)
        unit = meter.unit if meter else ""
        month = reading.date.month
        cost = Decimal(str(reading.total_cost))
        consumption = Decimal(str(reading.consumption or 0))

        existing = monthly[month].get(meter_id)
        if existing:
            monthly[month][meter_id] = MeterMonthStats(
                consumption=existing.consumption + consumption,
                cost=existing.cost + cost,
                unit=unit,
            )
        else:
            monthly[month][meter_id] = MeterMonthStats(consumption=consumption, cost=cost, unit=unit)

        yr = by_meter.get(meter_id)
        if yr:
            by_meter[meter_id] = MeterYearStats(consumption=yr.consumption + consumption, cost=yr.cost + cost)
        else:
            by_meter[meter_id] = MeterYearStats(consumption=consumption, cost=cost)

    months = [
        MonthStats(
            year=year,
            month=m,
            label=f"{_MONTH_LABELS[m - 1]} {str(year)[2:]}",
            by_meter=monthly.get(m, {}),
            total_cost=sum((s.cost for s in monthly.get(m, {}).values()), Decimal("0")),
        )
        for m in range(1, 13)
    ]

    total_cost = sum((s.cost for s in by_meter.values()), Decimal("0"))
    return YearStats(year=year, total_cost=total_cost, by_meter=by_meter, months=months)


def year_over_year_diff(
    current_stats: YearStats,
    prev_stats: YearStats,
) -> tuple[Decimal, int] | None:
    max_month = max((m.month for m in current_stats.months if m.total_cost > 0), default=None)
    if max_month is None:
        return None

    prev_cost = sum(
        (m.total_cost for m in prev_stats.months if m.month <= max_month),
        Decimal("0"),
    )
    if prev_cost == Decimal("0"):
        return None

    current_cost = sum(
        (m.total_cost for m in current_stats.months if m.month <= max_month),
        Decimal("0"),
    )
    percent = (current_cost - prev_cost) / prev_cost * Decimal("100")
    return percent, prev_stats.year
