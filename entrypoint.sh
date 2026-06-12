#!/bin/bash
set -euo pipefail

echo "→ Datenbank-Migrationen..."
if ! alembic upgrade head; then
    echo "FEHLER: Alembic-Migration fehlgeschlagen. Container wird nicht gestartet." >&2
    exit 1
fi

echo "→ Starte nginx + uvicorn via supervisord..."
exec supervisord -c /etc/supervisor/conf.d/meterflow.conf
