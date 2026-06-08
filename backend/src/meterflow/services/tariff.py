from datetime import date
from decimal import Decimal
from typing import Any


def find_active_tariff(tariff_history: list[dict[str, Any]], for_date: date) -> dict[str, Any] | None:
    """Return the tariff period active on for_date, or None if no tariff is configured."""
    candidates = []
    for period in tariff_history:
        valid_from_raw = period.get("validFrom") or period.get("valid_from")
        if valid_from_raw is None:
            continue
        valid_from = date.fromisoformat(str(valid_from_raw)[:10])
        if valid_from > for_date:
            continue
        valid_to_raw = period.get("validTo") or period.get("valid_to")
        if valid_to_raw is not None:
            valid_to = date.fromisoformat(str(valid_to_raw)[:10])
            if valid_to < for_date:
                continue
        candidates.append((valid_from, period))

    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def get_decimal(period: dict[str, Any], *keys: str) -> Decimal:
    for key in keys:
        val = period.get(key)
        if val is not None:
            return Decimal(str(val))
    return Decimal("0")
