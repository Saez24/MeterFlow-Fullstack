# ── Stage 1: Angular Build ────────────────────────────────────────────────────
FROM node:24-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline

COPY frontend/ .
RUN mkdir -p src/environments && \
    printf 'export const environment = { apiUrl: '"'"'/api/v1'"'"', production: true };\n' > src/environments/environment.ts && \
    printf 'export const environment = { apiUrl: '"'"'/api/v1'"'"', production: false };\n' > src/environments/environment.development.ts
RUN npm run build -- --configuration=production

# ── Stage 2: Python Build ─────────────────────────────────────────────────────
FROM python:3.13-slim AS backend-builder

WORKDIR /build
COPY backend/pyproject.toml .
COPY backend/src/ src/

RUN pip install --no-cache-dir build && \
    python -m build --wheel --outdir /wheels

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM python:3.13-slim

# System-Pakete: nginx + supervisor
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx supervisor curl && \
    rm -rf /var/lib/apt/lists/*

# Non-root user for uvicorn
RUN groupadd --system appuser && useradd --system --gid appuser --no-create-home appuser

# Python-Paket installieren
COPY --from=backend-builder /wheels/*.whl /tmp/
RUN pip install --no-cache-dir /tmp/*.whl && rm /tmp/*.whl

# Alembic-Migrations-Setup
WORKDIR /app
COPY backend/alembic.ini .
COPY backend/alembic/ alembic/

# Angular Static Files
COPY --from=frontend-builder /app/dist/MeterFlow/browser /usr/share/nginx/html

# /app owned by appuser so uvicorn and alembic can write
RUN chown -R appuser:appuser /app

# Default: 2 uvicorn workers — override with -e UVICORN_WORKERS=4
ENV UVICORN_WORKERS=2

# Konfiguration
COPY nginx.conf /etc/nginx/sites-available/default
COPY supervisord.conf /etc/supervisor/conf.d/meterflow.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
