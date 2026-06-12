import allure
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.base_test import BaseTest, DataGenerator
from tests.helpers.auth_api import AuthAPI


@allure.epic("MeterFlow API")
@allure.feature("Auth")
class TestAuthRegister(BaseTest):
    @allure.story("User Registration")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient, db: AsyncSession) -> None:
        api = AuthAPI(client)
        email = DataGenerator.email()
        password = DataGenerator.password()

        response = await api.register(email, password)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == email
        assert "id" in data
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    @allure.story("User Registration")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, db: AsyncSession) -> None:
        api = AuthAPI(client)
        email = DataGenerator.email()
        password = DataGenerator.password()

        await api.register(email, password)
        response = await api.register(email, password)

        assert response.status_code == 409


@allure.epic("MeterFlow API")
@allure.feature("Auth")
class TestAuthLogin(BaseTest):
    @allure.story("User Login")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, db: AsyncSession) -> None:
        api = AuthAPI(client)
        email = DataGenerator.email()
        password = DataGenerator.password()
        await api.register(email, password)

        response = await api.login(email, password)

        assert response.status_code == 200
        assert response.json()["email"] == email

    @allure.story("User Login")
    @allure.severity(allure.severity_level.NORMAL)
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, db: AsyncSession) -> None:
        api = AuthAPI(client)
        email = DataGenerator.email()
        await api.register(email, DataGenerator.password())

        response = await api.login(email, "wrong_password")

        assert response.status_code == 401

    @allure.story("Protected Route")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.asyncio
    async def test_me_requires_auth(self, client: AsyncClient, db: AsyncSession) -> None:
        api = AuthAPI(client)
        response = await api.me()
        assert response.status_code == 401

    @allure.story("Protected Route")
    @allure.severity(allure.severity_level.CRITICAL)
    @pytest.mark.asyncio
    async def test_me_after_login(self, client: AsyncClient, db: AsyncSession) -> None:
        api = AuthAPI(client)
        email = DataGenerator.email()
        password = DataGenerator.password()
        await api.register(email, password)
        await api.login(email, password)

        response = await api.me()

        assert response.status_code == 200
        assert response.json()["email"] == email
