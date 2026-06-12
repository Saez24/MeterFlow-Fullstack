#!/usr/bin/env python3
"""Import MeterFlow Supabase export JSON into PostgreSQL.

Usage:
    python import_supabase.py <export.json> <user_email>
"""

import asyncio
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from sqlalchemy import select

from meterflow.database import AsyncSessionLocal
from meterflow.models.meter import Meter
from meterflow.models.reading import Reading
from meterflow.models.user import User


def fix_encoding(s: str) -> str:
    """Fix 'mÂ³' → 'm³' (UTF-8 bytes misread as latin-1)."""
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def to_date(iso: str):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).date()


async def run(json_path: Path, user_email: str) -> None:
    data = json.loads(json_path.read_text(encoding="utf-8"))

    async with AsyncSessionLocal() as db:
        # ── Nutzer suchen ──────────────────────────────────────────────
        result = await db.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"✗ Nutzer '{user_email}' nicht gefunden. Bitte erst registrieren.")
            return
        user_id: uuid.UUID = user.id
        print(f"✓ Nutzer gefunden: {user.email}\n")

        # ── Zähler importieren ─────────────────────────────────────────
        meters_added = 0
        for m in data["meters"]:
            mid = uuid.UUID(m["id"])
            if await db.get(Meter, mid):
                print(f"  ~ Zähler bereits vorhanden: {m['name']}")
                continue

            meter = Meter(
                id=mid,
                user_id=user_id,
                name=m["name"],
                type=m["type"],
                unit=fix_encoding(m.get("unit", "")),
                icon=m.get("icon", "speed"),
                color=m.get("color", "#6B7280"),
                active=m.get("active", True),
                archived=False,
                meter_number=m.get("meterNumber"),
                provider=m.get("provider"),
                notes=m.get("notes"),
                calorific_value=m.get("calorificValue"),
                z_number=m.get("zNumber"),
                connected_load_kw=m.get("connectedLoadKw"),
                linked_water_meter_id=(
                    uuid.UUID(m["linkedWaterMeterId"]) if m.get("linkedWaterMeterId") else None
                ),
                tariff_history=m.get("tariffHistory", []),
                budget=m.get("budget"),
            )
            db.add(meter)
            meters_added += 1
            print(f"  + Zähler: {m['name']} ({m['type']})")

        await db.flush()

        # ── Ablesungen importieren ─────────────────────────────────────
        readings_added = 0
        skipped = 0
        for r in data["readings"]:
            rid = uuid.UUID(r["id"])
            if await db.get(Reading, rid):
                skipped += 1
                continue

            reading = Reading(
                id=rid,
                user_id=user_id,
                meter_id=uuid.UUID(r["meterId"]),
                date=to_date(r["date"]),
                value=r["value"],
                consumption=r.get("consumption"),
                kwh=r.get("kwh"),
                cost=r.get("cost"),
                wastewater_cost=r.get("wastewaterCost"),
                total_cost=r.get("totalCost"),
                note=r.get("note") or None,
                photo=r.get("photo"),
            )
            db.add(reading)
            readings_added += 1

        await db.commit()

    print(f"\n✓ Import abgeschlossen:")
    print(f"  Zähler:    {meters_added} importiert")
    print(f"  Ablesungen: {readings_added} importiert, {skipped} bereits vorhanden")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Verwendung: python import_supabase.py <export.json> <user@email.de>")
        sys.exit(1)

    asyncio.run(run(Path(sys.argv[1]), sys.argv[2]))
