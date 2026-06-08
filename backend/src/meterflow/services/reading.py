from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from meterflow.models.meter import Meter
from meterflow.models.reading import Reading
from meterflow.services.tariff import find_active_tariff, get_decimal

_GAS_CALORIFIC_DEFAULT = Decimal("10.55")
_GAS_Z_NUMBER_DEFAULT = Decimal("0.9672")


@dataclass
class ComputedReading:
    consumption: Decimal | None
    kwh: Decimal | None
    cost: Decimal | None
    wastewater_cost: Decimal | None
    total_cost: Decimal | None


def compute_reading(
    meter: Meter,
    previous_value: Decimal | None,
    new_value: Decimal,
    new_date: date,
    previous_date: date | None,
    garden_meter: Meter | None = None,
    garden_previous_value: Decimal | None = None,
) -> ComputedReading:
    if previous_value is None:
        return ComputedReading(None, None, None, None, None)

    consumption = new_value - previous_value
    tariff = find_active_tariff(meter.tariff_history or [], new_date)
    if tariff is None:
        return ComputedReading(consumption, None, None, None, None)

    price_per_unit = get_decimal(tariff, "pricePerUnit", "price_per_unit")
    base_charge = get_decimal(tariff, "baseCharge", "base_charge")
    days = (new_date - previous_date).days if previous_date else 30

    energy_type = meter.type
    kwh: Decimal | None = None
    cost: Decimal | None = None
    wastewater_cost: Decimal | None = None

    if energy_type == "gas":
        cal_val = Decimal(str(meter.calorific_value)) if meter.calorific_value else _GAS_CALORIFIC_DEFAULT
        z_num = Decimal(str(meter.z_number)) if meter.z_number else _GAS_Z_NUMBER_DEFAULT
        kwh = consumption * cal_val * z_num
        cost = kwh * price_per_unit + base_charge * Decimal(days) / Decimal(30)

    elif energy_type == "fernwarme":
        annual_base = get_decimal(tariff, "annualBasePrice", "annual_base_price")
        base_per_kw = get_decimal(tariff, "basePricePerKw", "base_price_per_kw")
        threshold_kw = get_decimal(tariff, "capacityThresholdKw", "capacity_threshold_kw")
        connected_kw = Decimal(str(meter.connected_load_kw)) if meter.connected_load_kw else Decimal("0")
        excess = max(Decimal("0"), connected_kw - threshold_kw)
        daily_fixed = (annual_base + excess * base_per_kw) / Decimal(365)
        consumption_mwh = consumption  # unit is MWh
        cost = daily_fixed * Decimal(days) + consumption_mwh * price_per_unit

    elif energy_type == "water":
        wastewater_price = get_decimal(tariff, "wastewaterPrice", "wastewater_price")
        fresh_cost = consumption * price_per_unit + base_charge * Decimal(days) / Decimal(30)

        if garden_meter is not None and garden_previous_value is not None:
            garden_consumption = new_value - garden_previous_value
            billable = max(Decimal("0"), consumption - garden_consumption)
        else:
            billable = consumption

        wastewater_cost = billable * wastewater_price
        cost = fresh_cost
        return ComputedReading(consumption, kwh, cost, wastewater_cost, fresh_cost + wastewater_cost)

    else:
        cost = consumption * price_per_unit + base_charge * Decimal(days) / Decimal(30)

    return ComputedReading(consumption, kwh, cost, wastewater_cost, cost)


def recalculate_readings(meter: Meter, readings: list[Reading]) -> list[Reading]:
    """Recompute consumption+cost for all readings sorted by date."""
    sorted_readings = sorted(readings, key=lambda r: r.date)
    for i, reading in enumerate(sorted_readings):
        prev = sorted_readings[i - 1] if i > 0 else None
        computed = compute_reading(
            meter=meter,
            previous_value=Decimal(str(prev.value)) if prev else None,
            new_value=Decimal(str(reading.value)),
            new_date=reading.date,
            previous_date=prev.date if prev else None,
        )
        reading.consumption = computed.consumption
        reading.kwh = computed.kwh
        reading.cost = computed.cost
        reading.wastewater_cost = computed.wastewater_cost
        reading.total_cost = computed.total_cost
    return sorted_readings
