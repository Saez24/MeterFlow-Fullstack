from decimal import Decimal
from typing import Any

from pydantic import BaseModel, field_validator

from meterflow.models.meter import Meter
from meterflow.schemas.stats import BudgetAlert, MonthStats


class _BudgetConfig(BaseModel):
    alertAt: Decimal = Decimal("80")
    monthlyLimit: Decimal | None = None
    consumptionLimit: Decimal | None = None

    @field_validator("alertAt", "monthlyLimit", "consumptionLimit", mode="before")
    @classmethod
    def _coerce_decimal(cls, v: Any) -> Any:
        if v is None:
            return v
        try:
            return Decimal(str(v))
        except Exception:
            return None


def _parse_budget(raw: dict[str, Any]) -> _BudgetConfig | None:
    try:
        return _BudgetConfig.model_validate(raw)
    except Exception:
        return None


def get_budget_alerts(
    meters: list[Meter],
    month_stats: MonthStats,
) -> list[BudgetAlert]:
    alerts: list[BudgetAlert] = []

    for meter in meters:
        if not meter.budget:
            continue
        budget = _parse_budget(meter.budget)
        if budget is None:
            continue
        meter_id_str = str(meter.id)
        meter_stats = month_stats.by_meter.get(meter_id_str)
        alert_at = budget.alertAt
        color = meter.color

        if meter_stats is None:
            continue

        if budget.monthlyLimit is not None:
            limit = budget.monthlyLimit
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

        if budget.consumptionLimit is not None:
            limit = budget.consumptionLimit
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
