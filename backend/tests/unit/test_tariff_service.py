from datetime import date

import allure

from meterflow.services.tariff import find_active_tariff


@allure.epic("MeterFlow API")
@allure.feature("Tariff Service")
class TestFindActiveTariff:
    @allure.story("Tariff Lookup")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_returns_none_for_empty_history(self) -> None:
        result = find_active_tariff([], date(2024, 6, 1))
        assert result is None

    @allure.story("Tariff Lookup")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_returns_active_tariff(self) -> None:
        history = [{"id": "t1", "validFrom": "2024-01-01", "pricePerUnit": "0.30", "baseCharge": "10"}]
        result = find_active_tariff(history, date(2024, 6, 1))
        assert result is not None
        assert result["id"] == "t1"

    @allure.story("Tariff Lookup")
    @allure.severity(allure.severity_level.NORMAL)
    def test_returns_most_recent_when_multiple(self) -> None:
        history = [
            {"id": "old", "validFrom": "2023-01-01", "pricePerUnit": "0.25", "baseCharge": "8"},
            {"id": "new", "validFrom": "2024-01-01", "pricePerUnit": "0.35", "baseCharge": "12"},
        ]
        result = find_active_tariff(history, date(2024, 6, 1))
        assert result is not None
        assert result["id"] == "new"

    @allure.story("Tariff Lookup")
    @allure.severity(allure.severity_level.NORMAL)
    def test_future_tariff_not_returned(self) -> None:
        history = [{"id": "future", "validFrom": "2025-01-01", "pricePerUnit": "0.40", "baseCharge": "15"}]
        result = find_active_tariff(history, date(2024, 6, 1))
        assert result is None

    @allure.story("Tariff Lookup")
    @allure.severity(allure.severity_level.NORMAL)
    def test_expired_tariff_not_returned(self) -> None:
        history = [
            {
                "id": "expired",
                "validFrom": "2023-01-01",
                "validTo": "2023-12-31",
                "pricePerUnit": "0.25",
                "baseCharge": "8",
            }
        ]
        result = find_active_tariff(history, date(2024, 6, 1))
        assert result is None
