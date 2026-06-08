from decimal import Decimal

from meterflow.models.co2_factor import Co2Factor
from meterflow.schemas.co2_factor import Co2DefaultResponse

CO2_DEFAULTS: dict[str, tuple[float, str]] = {
    "electricity": (0.380, "kWh"),
    "gas": (2.020, "m³"),
    "water": (0.000, "m³"),
    "garden_water": (0.000, "m³"),
    "heating_oil": (2.680, "Liter"),
    "solar": (-0.050, "kWh"),
    "fernwarme": (75.000, "MWh"),
}

_CO2_SOURCE = "Umweltbundesamt 2024"


def get_defaults() -> list[Co2DefaultResponse]:
    return [
        Co2DefaultResponse(energy_type=et, factor_kg_per_unit=factor, unit=unit, source=_CO2_SOURCE)
        for et, (factor, unit) in CO2_DEFAULTS.items()
    ]


def calculate_co2(
    energy_type: str,
    consumption: Decimal,
    user_factors: list[Co2Factor],
) -> Decimal:
    for factor in user_factors:
        if factor.energy_type == energy_type:
            return consumption * Decimal(str(factor.factor_kg_per_unit))
    default = CO2_DEFAULTS.get(energy_type)
    if default is None:
        return Decimal("0")
    return consumption * Decimal(str(default[0]))
