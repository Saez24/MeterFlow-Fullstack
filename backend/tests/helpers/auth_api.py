import allure
from httpx import AsyncClient, Response


class AuthAPI:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    @allure.step("Register user {email}")
    async def register(self, email: str, password: str) -> Response:
        return await self.client.post(
            "/api/v1/auth/register", json={"email": email, "password": password}
        )

    @allure.step("Login user {email}")
    async def login(self, email: str, password: str) -> Response:
        return await self.client.post(
            "/api/v1/auth/login", json={"email": email, "password": password}
        )

    @allure.step("Refresh token")
    async def refresh(self) -> Response:
        return await self.client.post("/api/v1/auth/refresh")

    @allure.step("Logout")
    async def logout(self) -> Response:
        return await self.client.post("/api/v1/auth/logout")

    @allure.step("Get current user")
    async def me(self) -> Response:
        return await self.client.get("/api/v1/auth/me")
