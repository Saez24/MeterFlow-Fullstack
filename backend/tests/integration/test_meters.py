import allure
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.base_test import BaseTest, DataGenerator
from tests.helpers.meter_api import MeterAPI


_METER_PAYLOAD = {
    "name": "Hauptzähler Strom",
    "type": "electricity",
    "unit": "kWh",
    "icon": "bolt",
    "color": "#F59E0B",
    "tariff_history": [
        {
            "id": "t1",
            "validFrom": "2024-01-01",
            "pricePerUnit": "0.35",
            "baseCharge": "12.50",
        }
    ],
}


@allure.epic("MeterFlow API")
@allure.feature("Meters")
class TestMeters(BaseTest):
    @allure.story("Meter CRUD")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.asyncio
    async def test_create_meter(self, client: AsyncClient, db: AsyncSession) -> None:
        await self.register_and_login(client)
        api = MeterAPI(client)

        response = await api.create(_METER_PAYLOAD)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Hauptzähler Strom"
        assert data["type"] == "electricity"

    @allure.story("Meter CRUD")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.asyncio
    async def test_list_meters(self, client: AsyncClient, db: AsyncSession) -> None:
        await self.register_and_login(client)
        api = MeterAPI(client)
        await api.create(_METER_PAYLOAD)

        response = await api.list_meters()

        assert response.status_code == 200
        assert len(response.json()) >= 1

    @allure.story("Meter CRUD")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.asyncio
    async def test_update_meter(self, client: AsyncClient, db: AsyncSession) -> None:
        await self.register_and_login(client)
        api = MeterAPI(client)
        created = (await api.create(_METER_PAYLOAD)).json()

        import uuid
        response = await api.update(uuid.UUID(created["id"]), {"name": "Geänderter Name"})

        assert response.status_code == 200
        assert response.json()["name"] == "Geänderter Name"

    @allure.story("Meter CRUD")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.asyncio
    async def test_delete_meter(self, client: AsyncClient, db: AsyncSession) -> None:
        await self.register_and_login(client)
        api = MeterAPI(client)
        created = (await api.create(_METER_PAYLOAD)).json()

        import uuid
        delete_resp = await api.delete(uuid.UUID(created["id"]))
        assert delete_resp.status_code == 204

        get_resp = await api.get(uuid.UUID(created["id"]))
        assert get_resp.status_code == 404

    @allure.story("Authorization")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.asyncio
    async def test_meter_isolation_between_users(self, client: AsyncClient, db: AsyncSession) -> None:
        await self.register_and_login(client)
        api = MeterAPI(client)
        created = (await api.create(_METER_PAYLOAD)).json()

        # Login als anderer User
        await self.register_and_login(client)

        import uuid
        response = await api.get(uuid.UUID(created["id"]))
        assert response.status_code == 404
