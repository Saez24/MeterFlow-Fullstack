import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.models.meter import Meter
from meterflow.repositories.base import BaseRepository
from meterflow.schemas.meter import MeterCreate, MeterUpdate


class MeterRepository(BaseRepository[Meter]):
    model = Meter

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        active_only: bool = False,
        energy_type: str | None = None,
    ) -> list[Meter]:
        stmt = select(Meter).where(Meter.user_id == user_id)
        if active_only:
            stmt = stmt.where(Meter.active.is_(True))
        if energy_type is not None:
            stmt = stmt.where(Meter.type == energy_type)
        stmt = stmt.order_by(Meter.created_at)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, user_id: uuid.UUID, data: MeterCreate) -> Meter:
        meter = Meter(user_id=user_id, **data.model_dump())
        return await self.save(meter)

    async def update(self, meter: Meter, data: MeterUpdate) -> Meter:
        updates = data.model_dump(exclude_none=True)
        self._apply_updates(meter, updates)
        return await self.save(meter)
