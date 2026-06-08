import uuid
from datetime import date

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.models.reading import Reading
from meterflow.repositories.base import BaseRepository
from meterflow.schemas.reading import ReadingCreate, ReadingUpdate


class ReadingRepository(BaseRepository[Reading]):
    model = Reading

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def list_for_meter(
        self,
        meter_id: uuid.UUID,
        user_id: uuid.UUID,
        year: int | None = None,
        limit: int = 100,
        cursor: date | None = None,
    ) -> list[Reading]:
        stmt = select(Reading).where(
            Reading.meter_id == meter_id,
            Reading.user_id == user_id,
        )
        if year is not None:
            stmt = stmt.where(Reading.date >= date(year, 1, 1), Reading.date <= date(year, 12, 31))
        if cursor is not None:
            stmt = stmt.where(Reading.date < cursor)
        stmt = stmt.order_by(Reading.date.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_for_user_year(self, user_id: uuid.UUID, year: int) -> list[Reading]:
        stmt = (
            select(Reading)
            .where(
                Reading.user_id == user_id,
                Reading.date >= date(year, 1, 1),
                Reading.date <= date(year, 12, 31),
            )
            .order_by(Reading.date)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_previous(self, meter_id: uuid.UUID, before_date: date) -> Reading | None:
        result = await self.db.execute(
            select(Reading)
            .where(Reading.meter_id == meter_id, Reading.date < before_date)
            .order_by(Reading.date.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: uuid.UUID, data: ReadingCreate) -> Reading:
        reading = Reading(user_id=user_id, **data.model_dump())
        return await self.save(reading)

    async def update(self, reading: Reading, data: ReadingUpdate) -> Reading:
        updates = data.model_dump(exclude_none=True)
        self._apply_updates(reading, updates)
        return await self.save(reading)

    async def bulk_update_computed(
        self,
        readings: list[Reading],
    ) -> None:
        for r in readings:
            await self.db.execute(
                update(Reading)
                .where(Reading.id == r.id)
                .values(
                    consumption=r.consumption,
                    kwh=r.kwh,
                    cost=r.cost,
                    wastewater_cost=r.wastewater_cost,
                    total_cost=r.total_cost,
                )
            )
        await self.db.commit()
