#!/bin/sh
set -e

echo "→ Datenbank-Migrationen..."
alembic upgrade head

echo "→ Starte nginx + uvicorn via supervisord..."
exec supervisord -c /etc/supervisor/conf.d/meterflow.conf
