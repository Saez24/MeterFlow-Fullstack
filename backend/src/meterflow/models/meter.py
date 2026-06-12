from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from meterflow.models.base import Base, TimestampMixin, UUIDMixin


class Meter(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "meters"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    meter_number: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    calorific_value: Mapped[Decimal | None] = mapped_column(Numeric)
    z_number: Mapped[Decimal | None] = mapped_column(Numeric)
    connected_load_kw: Mapped[Decimal | None] = mapped_column(Numeric)
    linked_water_meter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meters.id", ondelete="SET NULL")
    )
    tariff_history: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    budget: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    user: Mapped[User] = relationship(back_populates="meters")  # type: ignore[name-defined]  # noqa: F821
    readings: Mapped[list[Reading]] = relationship(back_populates="meter", cascade="all, delete-orphan")  # type: ignore[name-defined]  # noqa: F821
