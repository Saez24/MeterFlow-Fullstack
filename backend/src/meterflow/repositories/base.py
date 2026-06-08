import uuid
from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, record_id: uuid.UUID, user_id: uuid.UUID) -> ModelT | None:
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == record_id,  # type: ignore[attr-defined]
                self.model.user_id == user_id,  # type: ignore[attr-defined]
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, record: ModelT) -> None:
        await self.db.delete(record)
        await self.db.commit()

    async def save(self, record: ModelT) -> ModelT:
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    def _apply_updates(self, record: ModelT, updates: dict[str, Any]) -> None:
        for field, value in updates.items():
            if value is not None:
                setattr(record, field, value)
