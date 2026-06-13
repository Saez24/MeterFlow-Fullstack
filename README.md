# MeterFlow

> Intelligente Energieverwaltung für dein Zuhause — Strom, Gas, Wasser und mehr auf einen Blick.

MeterFlow ist eine selbst-gehostete Web-App zur Erfassung und Auswertung von Energiezählerständen. Verwalte alle deine Zähler an einem Ort, behalte Kosten im Überblick und erkenne Verbrauchsmuster mit übersichtlichen Diagrammen — ohne Cloud-Abhängigkeit.

---

## Tech Stack

| Bereich      | Technologie                                               |
| ------------ | --------------------------------------------------------- |
| Frontend     | Angular 22+ · Zoneless · Standalone Components · Signals |
| UI / Charts  | Angular Material M3 · Chart.js                           |
| Backend      | FastAPI (Python 3.13) · Pydantic v2 · async SQLAlchemy 2 |
| Auth         | JWT HS256 · HttpOnly Cookies · Refresh-Token-Rotation    |
| Datenbank    | PostgreSQL 17 · Alembic Migrations                       |
| Foto-Storage | MinIO (S3) · Lokaler Speicher · oder deaktiviert         |
| CI/CD        | GitHub Actions → GHCR · Trivy Security Scan              |
| Deployment   | Docker Multi-Stage · nginx + uvicorn · supervisord        |

---

## Schnellstart (Docker)

```bash
docker run -d \
  --name meterflow \
  -p 80:80 \
  -e DATABASE_URL=postgresql+asyncpg://user:password@host:5432/meterflow \
  -e JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))") \
  ghcr.io/saez24/meterflow:fullstack
```

Die App ist danach unter `http://localhost` erreichbar.

---

## Umgebungsvariablen

### Pflicht

| Variable       | Beschreibung                                                       | Beispiel                                             |
| -------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL-Verbindungsstring (asyncpg)                             | `postgresql+asyncpg://user:pass@localhost:5432/mydb` |
| `JWT_SECRET`   | Geheimer Schlüssel für JWT-Signierung — **min. 32 Zeichen** | `openssl rand -hex 32`                               |

### Optional — Auth & Server

| Variable                      | Standard              | Beschreibung                                    |
| ----------------------------- | --------------------- | ----------------------------------------------- |
| `JWT_ALGORITHM`               | `HS256`               | JWT-Algorithmus                                 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15`                  | Gültigkeit des Access-Tokens in Minuten         |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | `7`                   | Gültigkeit des Refresh-Tokens in Tagen          |
| `ENVIRONMENT`                 | `production`          | `development` oder `production`                 |
| `ALLOWED_ORIGINS`             | `http://localhost:4200` | Kommaseparierte CORS-Origins                  |
| `UVICORN_WORKERS`             | `2`                   | Anzahl uvicorn Worker-Prozesse                  |

### Optional — Foto-Storage

Standardmäßig ist der Foto-Upload deaktiviert (`STORAGE_BACKEND=none`).

| Variable             | Standard        | Beschreibung                                     |
| -------------------- | --------------- | ------------------------------------------------ |
| `STORAGE_BACKEND`    | `none`          | `none` · `local` · `minio`                       |
| `LOCAL_STORAGE_PATH` | `/data/photos`  | Pfad für lokalen Speicher (nur bei `local`)      |
| `S3_ENDPOINT`        | —               | MinIO/S3-Endpunkt (nur bei `minio`)              |
| `S3_ACCESS_KEY`      | —               | MinIO/S3 Access Key (nur bei `minio`)            |
| `S3_SECRET_KEY`      | —               | MinIO/S3 Secret Key (nur bei `minio`)            |
| `S3_BUCKET`          | `meter-photos`  | Bucket-Name (nur bei `minio`)                    |
| `S3_REGION`          | `us-east-1`     | Region (nur bei `minio`)                         |

---

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: meterflow
      POSTGRES_USER: meterflow
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    image: ghcr.io/saez24/meterflow:fullstack
    ports:
      - "80:80"
    environment:
      DATABASE_URL: postgresql+asyncpg://meterflow:changeme@postgres:5432/meterflow
      JWT_SECRET: dein-geheimer-schluessel-mindestens-32-zeichen
      ALLOWED_ORIGINS: http://localhost
    depends_on:
      - postgres

volumes:
  postgres_data:
```

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

API läuft unter `http://localhost:8000` — Docs unter `http://localhost:8000/docs`.

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

## Sicherheitshinweis

Tokens werden ausschließlich als **HttpOnly Cookies** gespeichert (`SameSite=Strict`) — niemals im `localStorage`. Das schützt gegen XSS-Angriffe, da JavaScript keinen Zugriff auf den Token hat.

---

## Roadmap

### In Arbeit

- [ ] Mobile App (Flutter · Riverpod · Supabase)

### Geplant

- [ ] Push-Benachrichtigungen bei Budget-Überschreitung
- [ ] CSV-Export für alle Ablesungen
- [ ] Tarif-Vergleich & Einsparpotenzial

### Fertig

- [x] Dashboard mit Jahres- und Monatsübersicht
- [x] Zählerverwaltung (Strom, Gas, Wasser, Solar, Heizöl, Fernwärme)
- [x] Automatische kWh-Umrechnung für Gas
- [x] Wasserabrechnung mit Gartenabzug
- [x] CO2-Berechnung mit konfigurierbaren Faktoren
- [x] Budget-Alerts
- [x] Jahresstatistiken & Vorjahresvergleich
- [x] Tarif-Historie pro Zähler
- [x] Dark / Light Mode
- [x] Mehrsprachigkeit (DE / EN)
- [x] Eigenes FastAPI-Backend (kein Supabase mehr)
- [x] JWT-Auth mit HttpOnly Cookies & Refresh-Token-Rotation
- [x] Pluggable Foto-Storage (MinIO / Lokal / Deaktiviert)
- [x] Docker-Deployment via GitHub Actions → GHCR
- [x] Trivy Container Security Scan in CI

---

## Lizenz

MIT © [saez24](https://github.com/saez24)
