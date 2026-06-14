#!/bin/bash
set -euo pipefail

# CSP nonce substitution relies on nginx's sub_filter module. Fail fast if it is
# missing, otherwise the __CSP_NONCE__ placeholder would leak and break the app.
if ! nginx -V 2>&1 | grep -q http_sub_module; then
    echo "FEHLER: nginx ohne ngx_http_sub_module gebaut — CSP-Nonce funktioniert nicht." >&2
    exit 1
fi

echo "→ Datenbank-Migrationen..."
if ! alembic upgrade head; then
    echo "FEHLER: Alembic-Migration fehlgeschlagen. Container wird nicht gestartet." >&2
    exit 1
fi

echo "→ Starte nginx + uvicorn via supervisord..."
exec supervisord -c /etc/supervisor/conf.d/meterflow.conf
