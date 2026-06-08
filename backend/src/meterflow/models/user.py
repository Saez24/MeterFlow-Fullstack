from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from meterflow.models.base import Base, TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)

    meters: Mapped[list["Meter"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # type: ignore[name-defined]
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # type: ignore[name-defined]
