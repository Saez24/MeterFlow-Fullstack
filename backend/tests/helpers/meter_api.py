import uuid

import allure
from httpx import AsyncClient, Response


class MeterAPI:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    @allure.step("List meters")
    async def list_meters(self, active: bool = False, type: str | None = None) -> Response:
        params: dict[str, str | bool] = {"active": active}
        if type:
            params["type"] = type
        return await self.client.get("/api/v1/meters/", params=params)

    @allure.step("Create meter")
    async def create(self, payload: dict) -> Response:
        return await self.client.post("/api/v1/meters/", json=payload)

    @allure.step("Get meter {meter_id}")
    async def get(self, meter_id: uuid.UUID) -> Response:
        return await self.client.get(f"/api/v1/meters/{meter_id}")

    @allure.step("Update meter {meter_id}")
    async def update(self, meter_id: uuid.UUID, payload: dict) -> Response:
        return await self.client.patch(f"/api/v1/meters/{meter_id}", json=payload)

    @allure.step("Delete meter {meter_id}")
    async def delete(self, meter_id: uuid.UUID) -> Response:
        return await self.client.delete(f"/api/v1/meters/{meter_id}")
