# MeterFlow

> Intelligente Energieverwaltung für dein Zuhause — Strom, Gas, Wasser und mehr auf einen Blick.

MeterFlow ist eine **selbst-gehostete Web-App** zur Erfassung und Auswertung von Energiezählerständen. Verwalte alle deine Zähler an einem Ort, behalte die Kosten im Überblick und erkenne Verbrauchsmuster mit übersichtlichen Diagrammen — komplett ohne Cloud-Abhängigkeit.

---

## Features

- 📊 **Dashboard** mit Jahres- und Monatsübersicht
- 🔌 **Zählerverwaltung** für Strom, Gas, Wasser, Solar, Heizöl & Fernwärme
- ⚡ **Automatische kWh-Umrechnung** für Gas
- 💧 **Wasserabrechnung** mit Gartenabzug
- 🌱 **CO₂-Berechnung** mit konfigurierbaren Faktoren
- 🔔 **Budget-Alerts** bei drohender Überschreitung
- 📈 **Jahresstatistiken** inkl. Vorjahresvergleich
- 💶 **Tarif-Historie** pro Zähler
- 🌓 **Dark / Light Mode**
- 🌍 **Mehrsprachig** (Deutsch / Englisch)

---

## Tech Stack

| Bereich      | Technologie                                                |
| ------------ | ---------------------------------------------------------- |
| Frontend     | Angular 22+ · Zoneless · Standalone Components · Signals   |
| UI / Charts  | Angular Material M3 · Chart.js                             |
| Backend      | FastAPI (Python 3.14) · Pydantic v2 · async SQLAlchemy 2   |
| Auth         | JWT HS256 · HttpOnly Cookies · Refresh-Token-Rotation      |
| Datenbank    | PostgreSQL 18 · Alembic Migrations                         |
| Foto-Storage | MinIO (S3) · lokaler Speicher · oder deaktiviert           |
| Build        | Node.js 24 · Docker Multi-Stage                            |
| Laufzeit     | nginx + uvicorn · supervisord (ein Container)              |
| CI/CD        | GitHub Actions → GHCR · Trivy Security-Scan                |

---

## Architektur

MeterFlow läuft als **ein einziger Container**. Darin verwaltet `supervisord` zwei Prozesse:

```
                 ┌─────────────── MeterFlow-Container ───────────────┐
   Port 80  ───▶ │  nginx  ──┬──▶  Angular-Statics (/usr/share/...)  │
                 │           └──▶  /api/v1  ──▶  uvicorn (FastAPI)    │
                 └────────────────────────────────────────────┬─────┘
                                                               ▼
                                                       PostgreSQL (extern)
```

- **nginx** liefert das gebaute Angular-Frontend aus und leitet alle `/api/v1`-Requests an uvicorn weiter (inkl. Rate-Limiting & Security-Headern).
- **uvicorn** betreibt die FastAPI-App; beim Start laufen automatisch die Alembic-Migrationen.
- **PostgreSQL** wird separat betrieben (eigener Container oder externer Server).
- Healthcheck: `GET /health` → `{"status": "ok"}`.

---

## Schnellstart (Docker Compose)

Empfohlener Weg — Datenbank und App in einem Rutsch:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: meterflow
      POSTGRES_USER: meterflow
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    image: ghcr.io/saez24/meterflow-fullstack:production
    ports:
      - "80:80"
    environment:
      DATABASE_URL: postgresql+asyncpg://meterflow:changeme@postgres:5432/meterflow
      JWT_SECRET: dein-geheimer-schluessel-mindestens-32-zeichen
      ALLOWED_ORIGINS: http://localhost
      # Hinter einem HTTPS-Proxy auf "true" setzen:
      COOKIE_SECURE: "false"
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

Starten mit `docker compose up -d` — die App ist danach unter `http://localhost` erreichbar.

### Alternative: `docker run`

```bash
docker run -d \
  --name meterflow \
  -p 80:80 \
  -e DATABASE_URL=postgresql+asyncpg://user:password@host:5432/meterflow \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  ghcr.io/saez24/meterflow-fullstack:production
```

### Verfügbare Image-Tags

| Tag                | Bedeutung                                                      |
| ------------------ | -------------------------------------------------------------- |
| `production`       | Aktueller Stand vom `production`-Branch                        |
| `1` · `1.2` · `1.2.3` | Stabile Releases (entstehen aus `v*`-Git-Tags)              |
| `sha-<commit>`     | Exakter Commit-Stand (für reproduzierbare Deployments)         |

Für stabile Produktiv-Deployments empfiehlt sich ein **Versions-Tag** statt `production`.

---

## Umgebungsvariablen

### Pflicht

| Variable       | Beschreibung                                                | Beispiel                                             |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL-Verbindungsstring (asyncpg)                      | `postgresql+asyncpg://user:pass@localhost:5432/mydb` |
| `JWT_SECRET`   | Geheimer Schlüssel für JWT-Signierung — **min. 32 Zeichen** | `openssl rand -hex 32`                               |

### Optional — Auth & Server

| Variable                      | Standard                | Beschreibung                                          |
| ----------------------------- | ----------------------- | ----------------------------------------------------- |
| `JWT_ALGORITHM`               | `HS256`                 | JWT-Algorithmus                                       |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15`                    | Gültigkeit des Access-Tokens in Minuten               |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | `7`                     | Gültigkeit des Refresh-Tokens in Tagen                |
| `ENVIRONMENT`                 | `production`            | `development` oder `production`                       |
| `ALLOWED_ORIGINS`             | `http://localhost:4200` | Kommaseparierte CORS-Origins                          |
| `COOKIE_SECURE`               | `false`                 | Auf `true` setzen, sobald die App hinter einem HTTPS-Proxy läuft (Secure-Flag für Auth-Cookies) |
| `UVICORN_WORKERS`             | `2`                     | Anzahl uvicorn Worker-Prozesse                        |

### Optional — Foto-Storage

Standardmäßig ist der Foto-Upload deaktiviert (`STORAGE_BACKEND=none`).

| Variable             | Standard       | Beschreibung                                |
| -------------------- | -------------- | ------------------------------------------- |
| `STORAGE_BACKEND`    | `none`         | `none` · `local` · `minio`                  |
| `LOCAL_STORAGE_PATH` | `/data/photos` | Pfad für lokalen Speicher (nur bei `local`) |
| `S3_ENDPOINT`        | —              | MinIO/S3-Endpunkt (nur bei `minio`)         |
| `S3_ACCESS_KEY`      | —              | MinIO/S3 Access Key (nur bei `minio`)       |
| `S3_SECRET_KEY`      | —              | MinIO/S3 Secret Key (nur bei `minio`)       |
| `S3_BUCKET`          | `meter-photos` | Bucket-Name (nur bei `minio`)               |
| `S3_REGION`          | `us-east-1`    | Region (nur bei `minio`)                    |

---

## Lokale Entwicklung

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

# .env anlegen (Vorlage: .env.example)
cp .env.example .env

# Datenbankmigrationen ausführen
alembic upgrade head

# Server starten
uvicorn meterflow.main:app --reload
```

Die API läuft unter `http://localhost:8000` — Docs (nur im Development) unter `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm start   # → http://localhost:4200 (Proxy → :8000)
```

### Tests

```bash
# Backend
cd backend
pytest -v

# Frontend
cd frontend
npm test -- --watch=false
```

---

## Sicherheit

- **HttpOnly Cookies** (`SameSite=Strict`) — Tokens liegen nie im `localStorage`, kein JavaScript-Zugriff → Schutz gegen XSS.
- **Refresh-Token-Rotation** — bei jedem Refresh wird das alte Token serverseitig invalidiert; das Logout widerruft serverseitig.
- **Content-Security-Policy** mit Per-Request-Nonce (keine `unsafe-inline`-Skripte).
- **Security-Header**: HSTS (preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, restriktive `Permissions-Policy`.
- **Rate-Limiting** über nginx: Auth-Endpunkte 3 Anfragen/Minute, übrige API 100 Anfragen/Minute.
- **Trivy-Scan** in der CI blockiert das Image bei CRITICAL/HIGH-Schwachstellen.

> Hinter einem HTTPS-Proxy unbedingt `COOKIE_SECURE=true` setzen.

---

## Roadmap

### In Arbeit

- [ ] Mobile App (Flutter · Riverpod · Supabase) — eigenständige App mit Supabase-Backend; die Web-App nutzt das FastAPI-Backend

### Geplant

- [ ] Push-Benachrichtigungen bei Budget-Überschreitung
- [ ] CSV-Export für alle Ablesungen
- [ ] Tarif-Vergleich & Einsparpotenzial

### Fertig

- [x] Dashboard mit Jahres- und Monatsübersicht
- [x] Zählerverwaltung (Strom, Gas, Wasser, Solar, Heizöl, Fernwärme)
- [x] Automatische kWh-Umrechnung für Gas
- [x] Wasserabrechnung mit Gartenabzug
- [x] CO₂-Berechnung mit konfigurierbaren Faktoren
- [x] Budget-Alerts
- [x] Jahresstatistiken & Vorjahresvergleich
- [x] Tarif-Historie pro Zähler
- [x] Dark / Light Mode
- [x] Mehrsprachigkeit (DE / EN)
- [x] Eigenes FastAPI-Backend (kein Supabase mehr im Web)
- [x] JWT-Auth mit HttpOnly Cookies & Refresh-Token-Rotation
- [x] Pluggable Foto-Storage (MinIO / Lokal / Deaktiviert)
- [x] Docker-Deployment via GitHub Actions → GHCR
- [x] Trivy Container Security-Scan in CI

---

## Lizenz

MIT © [saez24](https://github.com/Saez24)
