import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from meterflow.models.base import Base, TimestampMixin, UUIDMixin


class Co2Factor(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "co2_factors"
    __table_args__ = (UniqueConstraint("user_id", "energy_type", "valid_from", name="uq_co2_user_type_date"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    energy_type: Mapped[str] = mapped_column(Text, nullable=False)
    factor_kg_per_unit: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_url: Mapped[str | None] = mapped_column(Text)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
