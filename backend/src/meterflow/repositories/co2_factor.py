import uuid

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from meterflow.models.co2_factor import Co2Factor
from meterflow.repositories.base import BaseRepository
from meterflow.schemas.co2_factor import Co2FactorUpsert


class Co2FactorRepository(BaseRepository[Co2Factor]):
    model = Co2Factor

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def list_for_user(self, user_id: uuid.UUID) -> list[Co2Factor]:
        result = await self.db.execute(
            select(Co2Factor)
            .where(Co2Factor.user_id == user_id)
            .order_by(Co2Factor.energy_type, Co2Factor.valid_from.desc())
        )
        return list(result.scalars().all())

    async def upsert(self, user_id: uuid.UUID, data: Co2FactorUpsert) -> Co2Factor:
        stmt = (
            insert(Co2Factor)
            .values(
                user_id=user_id,
                energy_type=data.energy_type,
                factor_kg_per_unit=data.factor_kg_per_unit,
                unit=data.unit,
                source=data.source,
                source_url=data.source_url,
                valid_from=data.valid_from,
            )
            .on_conflict_do_update(
                constraint="uq_co2_user_type_date",
                set_={
                    "factor_kg_per_unit": data.factor_kg_per_unit,
                    "unit": data.unit,
                    "source": data.source,
                    "source_url": data.source_url,
                },
            )
            .returning(Co2Factor)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.scalar_one()

    async def delete_by_id(self, factor_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(Co2Factor).where(
                Co2Factor.id == factor_id,
                Co2Factor.user_id == user_id,
            )
        )
        await self.db.commit()
        return bool(result.rowcount)  # type: ignore[attr-defined]
