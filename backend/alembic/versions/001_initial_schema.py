"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("hashed_password", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_users_email", "users", ["email"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False, unique=True),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("idx_refresh_tokens_hash", "refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "meters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("icon", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("meter_number", sa.Text()),
        sa.Column("provider", sa.Text()),
        sa.Column("notes", sa.Text()),
        sa.Column("calorific_value", sa.Numeric()),
        sa.Column("z_number", sa.Numeric()),
        sa.Column("connected_load_kw", sa.Numeric()),
        sa.Column("linked_water_meter_id", UUID(as_uuid=True), sa.ForeignKey("meters.id", ondelete="SET NULL")),
        sa.Column("tariff_history", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("budget", JSONB()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_meters_user_id", "meters", ["user_id"])

    op.create_table(
        "readings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("meter_id", UUID(as_uuid=True), sa.ForeignKey("meters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("value", sa.Numeric(), nullable=False),
        sa.Column("consumption", sa.Numeric()),
        sa.Column("kwh", sa.Numeric()),
        sa.Column("cost", sa.Numeric()),
        sa.Column("wastewater_cost", sa.Numeric()),
        sa.Column("total_cost", sa.Numeric()),
        sa.Column("note", sa.Text()),
        sa.Column("photo", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_readings_user_id", "readings", ["user_id"])
    op.create_index("idx_readings_meter_id", "readings", ["meter_id"])
    op.create_index("idx_readings_date", "readings", [sa.text("date DESC")])

    op.create_table(
        "co2_factors",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("energy_type", sa.Text(), nullable=False),
        sa.Column("factor_kg_per_unit", sa.Numeric(12, 6), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("source_url", sa.Text()),
        sa.Column("valid_from", sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "energy_type", "valid_from", name="uq_co2_user_type_date"),
    )
    op.create_index("idx_co2_factors_user_id", "co2_factors", ["user_id"])


def downgrade() -> None:
    op.drop_table("co2_factors")
    op.drop_table("readings")
    op.drop_table("meters")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
