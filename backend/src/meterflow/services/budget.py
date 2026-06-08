from decimal import Decimal

from meterflow.models.meter import Meter
from meterflow.schemas.stats import BudgetAlert, MonthStats


def get_budget_alerts(
    meters: list[Meter],
    month_stats: MonthStats,
) -> list[BudgetAlert]:
    alerts: list[BudgetAlert] = []

    for meter in meters:
        if not meter.budget:
            continue
        budget = meter.budget
        meter_id_str = str(meter.id)
        meter_stats = month_stats.by_meter.get(meter_id_str)
        alert_at = Decimal(str(budget.get("alertAt", 80)))
        color = meter.color

        if meter_stats is None:
            continue

        monthly_limit = budget.get("monthlyLimit")
        if monthly_limit is not None:
            limit = Decimal(str(monthly_limit))
            current = meter_stats.cost
            percent = current / limit * Decimal("100") if limit > 0 else Decimal("0")
            if percent >= alert_at:
                alerts.append(
                    BudgetAlert(
                        meter_id=meter.id,
                        meter_name=meter.name,
                        type="monthly_cost",
                        current=current,
                        limit=limit,
                        percent=percent,
                        unit="€",
                        color=color,
                        critical=percent >= Decimal("100"),
                    )
                )

        consumption_limit = budget.get("consumptionLimit")
        if consumption_limit is not None:
            limit = Decimal(str(consumption_limit))
            current = meter_stats.consumption
            percent = current / limit * Decimal("100") if limit > 0 else Decimal("0")
            if percent >= alert_at:
                alerts.append(
                    BudgetAlert(
                        meter_id=meter.id,
                        meter_name=meter.name,
                        type="consumption",
                        current=current,
                        limit=limit,
                        percent=percent,
                        unit=meter.unit,
                        color=color,
                        critical=percent >= Decimal("100"),
                    )
                )

    return alerts
