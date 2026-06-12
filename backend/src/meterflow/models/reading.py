from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from meterflow.models.base import Base, TimestampMixin, UUIDMixin


class Reading(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "readings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    meter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meters.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    consumption: Mapped[Decimal | None] = mapped_column(Numeric)
    kwh: Mapped[Decimal | None] = mapped_column(Numeric)
    cost: Mapped[Decimal | None] = mapped_column(Numeric)
    wastewater_cost: Mapped[Decimal | None] = mapped_column(Numeric)
    total_cost: Mapped[Decimal | None] = mapped_column(Numeric)
    note: Mapped[str | None] = mapped_column(Text)
    photo: Mapped[str | None] = mapped_column(Text)

    meter: Mapped[Meter] = relationship(back_populates="readings")  # type: ignore[name-defined]  # noqa: F821
