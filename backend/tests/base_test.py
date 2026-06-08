import uuid
from datetime import date, timedelta
from decimal import Decimal

from faker import Faker
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.auth.service import hash_password
from meterflow.models.meter import Meter
from meterflow.models.reading import Reading
from meterflow.models.user import User

_fake = Faker("de_DE")


class DataGenerator:
    @staticmethod
    def email() -> str:
        return f"test_{uuid.uuid4().hex[:8]}@example.com"

    @staticmethod
    def password() -> str:
        return "Test@1234!"

    @staticmethod
    def meter_name() -> str:
        return f"Zähler_{uuid.uuid4().hex[:6]}"


class UserFactory:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, email: str | None = None, password: str = "Test@1234!") -> User:
        user = User(
            email=email or DataGenerator.email(),
            hashed_password=hash_password(password),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user


class MeterFactory:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: uuid.UUID, energy_type: str = "electricity") -> Meter:
        meter = Meter(
            user_id=user_id,
            name=DataGenerator.meter_name(),
            type=energy_type,
            unit="kWh",
            icon="bolt",
            color="#F59E0B",
            tariff_history=[
                {
                    "id": str(uuid.uuid4()),
                    "validFrom": "2024-01-01",
                    "pricePerUnit": "0.35",
                    "baseCharge": "12.50",
                }
            ],
        )
        self.db.add(meter)
        await self.db.commit()
        await self.db.refresh(meter)
        return meter


class ReadingFactory:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        meter_id: uuid.UUID,
        value: Decimal = Decimal("1000"),
        reading_date: date | None = None,
    ) -> Reading:
        reading = Reading(
            user_id=user_id,
            meter_id=meter_id,
            date=reading_date or date.today(),
            value=value,
        )
        self.db.add(reading)
        await self.db.commit()
        await self.db.refresh(reading)
        return reading


class BaseTest:
    async def register_and_login(self, client: AsyncClient, email: str | None = None) -> str:
        email = email or DataGenerator.email()
        password = DataGenerator.password()
        await client.post("/api/v1/auth/register", json={"email": email, "password": password})
        resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200
        return email
