# MeterFlow – Blueprint

**Zuletzt aktualisiert:** 2026-06-06 (Session 18)  
**Version:** 0.1.0  
**Angular:** 21.x · **Material:** 21.x · **FastAPI:** 0.115+ · **SQLAlchemy:** 2.0 · **PostgreSQL:** 17 · **Chart.js:** 4.x

---

## Stack

| Schicht    | Technologie                                |
| ---------- | ------------------------------------------ |
| Schicht    | Technologie                                |
| ---------- | ------------------------------------------ |
| Framework  | Angular 21 (Standalone, Zoneless)          |
| UI         | Angular Material 3 (Apple-Skin)            |
| State      | Signals (`signal`, `computed`, `resource`) |
| Backend    | FastAPI 0.115+ (Python 3.13)               |
| ORM        | SQLAlchemy 2.0 async + asyncpg             |
| Auth       | Eigenes JWT (HS256) + HttpOnly Cookies     |
| Datenbank  | PostgreSQL 17 (Docker)                     |
| Migrations | Alembic                                    |
| Storage    | MinIO (S3-kompatibel)                      |
| Charts     | Chart.js 4                                 |
| Tests Web  | Vitest (Unit) · Playwright (E2E)           |
| Tests API  | pytest + httpx + Allure (OOP)              |
| Styling    | SCSS + CSS-Variablen (Apple Design System) |
| Sprache    | TypeScript strict · Python 3.13            |

---

## Frontend-Architektur

```
src/app/
├── app.ts / app.html / app.scss    ← Root-Shell (Sidebar, Mobile-Nav, Auth-Guard)
├── app.config.ts                   ← provideZonelessChangeDetection, LOCALE_ID
├── app.routes.ts                   ← Alle Routen mit canActivate: [authGuard]
├── core/
│   ├── guards/auth.guard.ts        ← Supabase-Session-Guard
│   ├── models/energy.models.ts     ← Alle Domain-Interfaces & Enums
│   ├── services/
│   │   ├── supabase.service.ts     ← API-Zentrale (Auth + CRUD)
│   │   ├── meter.service.ts        ← Signal-State: Zähler
│   │   ├── reading.service.ts      ← Signal-State: Ablesungen
│   │   ├── tariff.service.ts       ← Tarif-Logik
│   │   ├── stats.service.ts        ← Berechnungen / KPIs
│   │   ├── dashboard-state.service.ts
│   │   ├── meter-detail-state.service.ts
│   │   ├── data-sync.service.ts    ← Import / Export (JSON)
│   │   ├── storage.service.ts
│   │   ├── theme.service.ts        ← Light / Dark / System
│   │   └── energy.service.ts
│   └── validators/
│       └── decimal-places.validator.ts
├── features/
│   ├── auth/                       ← Login + Register
│   ├── dashboard/                  ← KPI-Karten, Übersicht
│   ├── meters/
│   │   ├── meters.*                ← Zähler-Liste
│   │   ├── meter-form/             ← Anlegen / Bearbeiten
│   │   ├── meter-detail/           ← Tab-basiertes Detail
│   │   │   └── tabs/
│   │   │       ├── meter-chart/    ← Chart.js Verlauf
│   │   │       ├── meter-readings/ ← Ablesungen + Foto
│   │   │       ├── meter-tariffs/  ← Tarifverwaltung
│   │   │       └── meter-costs/    ← Kostenübersicht
│   │   └── cost-preview/           ← Echtzeit-Kostenvorschau
│   ├── readings/
│   │   ├── readings.*              ← Ablesungs-Liste mit Filter
│   │   └── readings-form/          ← Neue Ablesung / Bearbeiten
│   ├── reports/                    ← Auswertungen / Diagramme
│   └── settings/                   ← Theme, Export, Import, Logout
└── shared/
    └── components/
        ├── confirm-dialog/         ← Wiederverwendbarer Bestätigungsdialog (MatDialog)
        ├── readings-list/          ← Tabelle mit Delete-Action
        ├── tariff-form/            ← Tarif anlegen / bearbeiten
        └── tariff-history/         ← Tarif-Perioden-Anzeige
```

---

## Backend-Architektur

```
backend/
├── pyproject.toml                    # black, ruff, mypy strict, pytest, alembic
├── .env.example                      # JWT_SECRET, DATABASE_URL, S3_*, ALLOWED_ORIGINS
├── alembic.ini
├── alembic/versions/
│   └── 001_initial_schema.py        # users, refresh_tokens, meters, readings, co2_factors
├── src/meterflow/
│   ├── main.py                      # App-Factory, lifespan, CORS, Router-Registrierung
│   ├── config.py                    # pydantic-settings BaseSettings
│   ├── database.py                  # async engine, get_db Dependency
│   ├── auth/
│   │   ├── dependencies.py          # get_current_user → CurrentUser(id, email)
│   │   ├── router.py                # POST /auth/register, /login, /refresh, /logout + GET /me
│   │   ├── service.py               # Passwort-Hashing (bcrypt), Token-Generierung
│   │   └── schemas.py               # RegisterRequest, LoginRequest, TokenResponse
│   ├── models/                      # SQLAlchemy 2.0 mapped[] ORM-Klassen
│   │   ├── base.py                  # DeclarativeBase, UUID-PK, timestamptz-Mixin
│   │   ├── user.py                  # User (id, email, hashed_password, created_at)
│   │   ├── refresh_token.py         # RefreshToken (user_id, token_hash, expires_at, revoked)
│   │   ├── meter.py                 # Meter (tariff_history JSONB, budget JSONB)
│   │   ├── reading.py               # Reading
│   │   └── co2_factor.py            # Co2Factor
│   ├── schemas/                     # Pydantic v2 Request/Response-Schemas
│   │   ├── meter.py
│   │   ├── reading.py
│   │   ├── co2_factor.py
│   │   └── stats.py                 # MonthStats, YearStats, BudgetAlert
│   ├── repositories/                # Datenzugriff, nur select()-Stil, kein raw SQL
│   │   ├── base.py                  # BaseRepository[ModelT]
│   │   ├── meter.py
│   │   ├── reading.py
│   │   └── co2_factor.py
│   ├── services/                    # Business-Logik (kein DB-Zugriff direkt)
│   │   ├── tariff.py                # Aktiven Tarif für Datum finden
│   │   ├── reading.py               # Verbrauch + Kosten berechnen
│   │   ├── co2.py                   # CO₂-Berechnung, Fallback auf UBA-Defaults
│   │   ├── stats.py                 # Monats-/Jahresstatistiken, YoY-Vergleich
│   │   └── budget.py                # Budget-Alerts generieren
│   └── routers/
│       ├── auth.py                  # /api/v1/auth
│       ├── meters.py                # /api/v1/meters
│       ├── readings.py              # /api/v1/readings
│       ├── co2_factors.py           # /api/v1/co2-factors
│       └── stats.py                 # /api/v1/stats
└── tests/
    ├── conftest.py                  # async Test-DB, Fixtures
    ├── base_test.py                 # BaseTest, DataGenerator, Factories
    ├── helpers/                     # API-Service-Klassen mit @allure.step
    └── integration/                 # Klassen-basierte pytest-Tests
```

### Auth-Flow (HttpOnly Cookies)

- **Login** → FastAPI setzt `access_token` (15 min) + `refresh_token` (30 Tage) als `HttpOnly; Secure; SameSite=Strict` Cookies
- **Kein localStorage** — Tokens sind für JavaScript nicht lesbar (XSS-Schutz)
- **Angular:** `HttpClient` mit `withCredentials: true` — kein manueller Token-Interceptor
- **Refresh:** Angular-Interceptor fängt 401 ab → `POST /api/v1/auth/refresh` → neues Access-Token Cookie
- **nginx:** Frontend und Backend auf gleicher Domain — `/api/v1/*` wird proxied zu `http://api:8000`

### API-Endpunkte

| Router       | Basis-Pfad            | Auth                                |
| ------------ | --------------------- | ----------------------------------- |
| Auth         | `/api/v1/auth`        | register/login öffentlich, rest JWT |
| Meters       | `/api/v1/meters`      | JWT                                 |
| Readings     | `/api/v1/readings`    | JWT                                 |
| CO₂-Faktoren | `/api/v1/co2-factors` | JWT                                 |
| Stats        | `/api/v1/stats`       | JWT                                 |
| Health       | `/health`             | öffentlich                          |

---

## Domain-Modell

### EnergyType

`electricity` · `gas` · `water` · `garden_water` · `heating_oil` · `solar` · `fernwarme`

### Kerninterfaces

- **`MeterConfig`** – Zähler-Konfiguration inkl. `tariffHistory: TariffPeriod[]`, `budget?: BudgetConfig`
- **`MeterReading`** – Ablesung mit berechneten Feldern (`consumption`, `kwh`, `cost`, `totalCost`)
- **`TariffPeriod`** – Zeitraum-Tarif mit `pricePerUnit`, `baseCharge`, Emissions- und Fernwärme-Feldern
- **`BudgetConfig`** – Monats-/Jahreslimit + Warn-Schwelle

---

## Daten & Backend

### PostgreSQL-Schema (`backend/alembic/versions/`)

| Tabelle          | Schlüsselfelder                                                    | Schutz                        |
| ---------------- | ------------------------------------------------------------------ | ----------------------------- |
| `users`          | `id` UUID, `email` unique, `hashed_password`, `created_at`         | –                             |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked`             | FK auf users                  |
| `meters`         | `id`, `user_id`, `type`, `tariff_history` JSONB, `budget` JSONB    | `user_id`-Filter in Repos     |
| `readings`       | `id`, `user_id`, `meter_id`, `date`, `value`, `cost`, `photo`      | `user_id`-Filter in Repos     |
| `co2_factors`    | `id`, `user_id`, `energy_type`, `factor_kg_per_unit`, `valid_from` | `unique(user_id, type, date)` |

### Sicherheit

- `user_id`-Filter in FastAPI-Repositories (ersetzt Supabase RLS)
- Auth via eigenes JWT (HS256, 15 min) + HttpOnly Refresh-Token Cookie
- Passwörter mit bcrypt gehasht (`passlib[bcrypt]`)
- Alle Routen außer `/auth/register`, `/auth/login`, `/health` durch `get_current_user` Dependency geschützt
- Fotos in MinIO (S3-kompatibel), Zugriff nur via signierte URLs

---

## Routing

| Route                | Komponente           | Guard       |
| -------------------- | -------------------- | ----------- |
| `/`                  | → `/dashboard`       | –           |
| `/auth`              | `Auth`               | –           |
| `/dashboard`         | `Dashboard`          | `authGuard` |
| `/meters`            | `Meters`             | `authGuard` |
| `/meters/new`        | `MeterForm`          | `authGuard` |
| `/meters/:id`        | `MeterDetail` (Tabs) | `authGuard` |
| `/meters/:id/edit`   | `MeterForm`          | `authGuard` |
| `/readings`          | `Readings`           | `authGuard` |
| `/readings/new`      | `ReadingsForm`       | `authGuard` |
| `/readings/:id/edit` | `ReadingsForm`       | `authGuard` |
| `/reports`           | `Reports`            | `authGuard` |
| `/settings`          | `Settings`           | `authGuard` |

---

## Design System (Apple-Stil)

### CSS-Variablen (Auszug)

```scss
--bg, --bg-surface, --bg-elevated
--text-primary, --text-secondary
--apple-blue, --apple-green, --apple-red
--border-subtle
--shadow-sm, --shadow-lg
```

### Geometrie

| Element | Radius |
| ------- | ------ |
| Buttons | 12px   |
| Cards   | 20px   |
| Dialoge | 20px   |

### Glasmorphismus

`.frosted-glass` → `backdrop-filter: blur(20px)` (Sidebar, Modals, Mobile-Header)

### Dark Mode

Via `[data-theme='dark']` und `body.dark-theme` – gesteuert durch `ThemeService` (light / dark / system)

---

## Coding-Konventionen

| Regel             | Standard                                                       |
| ----------------- | -------------------------------------------------------------- |
| Komponenten       | 100% Standalone, kein NgModule                                 |
| DI                | `inject()` Funktion, kein Konstruktor-DI                       |
| State             | `signal()`, `computed()` – kein RxJS in Komponenten            |
| RxJS (wenn nötig) | `takeUntilDestroyed()` für Cleanup                             |
| Dateinamen        | ohne `.component` Suffix: `name/name.ts`                       |
| Dialoge           | Immer `ConfirmDialogComponent` statt `window.confirm()`        |
| Tests             | Vitest + `provideZonelessChangeDetection()` in jedem `TestBed` |

---

## Bereits umgesetzt (2026-04-04)

- [x] **Security:** `window.confirm()` an allen 4 Stellen durch `ConfirmDialogComponent` (MatDialog) ersetzt
- [x] **Security:** `JSON.parse` in `data-sync.service.ts` mit try-catch + Typ-Validierung abgesichert
- [x] **Security:** Environment-Verzeichnis via `.gitignore` (`*environments`) geschützt; `environment.example.ts` als committierbares Template angelegt
- [x] **Testing:** `provideExperimentalZonelessChangeDetection()` in allen 13 Spec-Dateien ergänzt → in Session 8 auf `provideZonelessChangeDetection()` (Angular 21-API) umgestellt
- [x] **A11y:** `aria-label` an Sidebar-`<nav>`, Mobile-`<nav>`, allen Nav-Links und Action-Buttons in `app.html`
- [x] **A11y:** Clickable `<div class="meter-row">` → semantisches `<a>`-Element mit `aria-label` in `meters.html`
- [x] **Code-Qualität:** Doppelte `SupabaseService`-Injection in `app.ts` entfernt
- [x] **Code-Qualität:** Typo `supabse.service.ts` → `supabase.service.ts` (Datei + alle 17 Imports umbenannt)
- [x] **Code-Qualität:** `ngOnInit` in `meter-form.ts` → Konstruktor migriert
- [x] **Code-Qualität:** `ngOnInit` in `tariff-form.ts` → Konstruktor migriert
- [x] **Code-Qualität:** Magic Numbers `10.55` / `0.9672` → `GAS_DEFAULTS` in `core/constants/gas.constants.ts`
- [x] **RxJS:** Unverwaltetes `subscribe()` in `readings-form.ts` → `takeUntilDestroyed()`
- [x] **Supabase:** Migrations-Ordner `supabase/migrations/` mit initialem Schema + RLS-Policies angelegt
- [x] **Shared:** `ConfirmDialogComponent` unter `shared/components/confirm-dialog/` erstellt
- [x] **i18n:** `@angular/localize` v21.2.7 installiert; `main.ts`, `tsconfig.*.json`, `angular.json` aktualisiert
- [x] **i18n:** Alle 7 Templates mit `i18n="@@id"` und `i18n-placeholder` annotiert (`auth`, `dashboard`, `settings`, `reports`, `meters`, `readings`, `meter-form`, `readings-form`)
- [x] **$localize:** `app.ts` navItems + connectionTooltip, `auth.ts` translateError() + snackBar + errorMessage auf `$localize` umgestellt
- [x] **$localize:** Alle Feature-TS-Dateien (`meters`, `readings`, `settings`, `meter-form`, `readings-form`, `tariff-form`, `meter-tariffs`, `meter-readings`) mit `$localize` für snackBar + Dialog-Texte
- [x] **Security:** Letztes verbleibendes `confirm()` in `meter-readings.ts` → `ConfirmDialogComponent` + `$localize`
- [x] **i18n:** `ng extract-i18n` → `src/locale/messages.xlf` mit 188 Strings generiert
- [x] **Material M3:** `mat.define-theme` (light + dark) in `styles.scss` vollständig eingerichtet; `[data-theme='dark']` von `ThemeService` gesetzt; `mat.all-component-colors($dark-theme)` aktiv
- [x] **A11y:** Dynamischer Alt-Text für Zählerfotos im Modal: `{MeterName} – Ablesung vom {Datum}` via computed Signal + `DatePipe`
- [x] **A11y:** Aria-Labels auf Foto-, Edit- und Löschen-Buttons in `meter-readings.html` ergänzt
- [x] **i18n:** `meter-readings.html` annotiert (Leerstand, "Aktuell"-Badge, Foto-Alt-Text)
- [x] **Code-Qualität:** `ngOnInit` in `readings-form.ts` → Constructor migriert; `implements OnInit` entfernt
- [x] **Supabase Storage:** `supabase/migrations/20240102000000_storage_bucket.sql` – privater Bucket `meter-photos` + 4 RLS-Policies (INSERT/SELECT/UPDATE/DELETE nach `user_id`-Ordner)
- [x] **model():** Kein `@Input()`/`@Output()` mehr im Codebase – schon vollständig auf moderne Signal-API (`input()`, `inject()`, `MAT_DIALOG_DATA`) migriert
- [x] **Stats-Performance:** Doppelten `getMonthStats()`-Aufruf in `budgetAlerts` eliminiert – nutzt jetzt `yearStats.months` statt separatem Aufruf
- [x] **Storage Upload:** `SupabaseService.uploadPhoto()`, `getSignedPhotoUrl()`, `deletePhoto()` implementiert
- [x] **ReadingsForm:** Foto-Upload-UI eingebaut (Datei-Picker, Vorschau, Bestehendes-Foto-Anzeige im Edit-Modus, Entfernen-Button); Upload via `SupabaseService` vor dem Speichern; altes Foto wird beim Ersetzen oder Entfernen aus Storage gelöscht
- [x] **MeterReadings:** Private Fotos via `getSignedPhotoUrl()` geladen (lazy, on click); Backward-kompatibel mit alten absoluten URLs; Lade-Spinner im Modal; Foto wird beim Löschen der Ablesung auch aus Storage entfernt
- [x] **i18n EN:** `src/locale/messages.en.xlf` mit 201 englischen Übersetzungen angelegt; `angular.json` für `de`/`en`-Dual-Build konfiguriert (`/` → Deutsch, `/en/` → Englisch); `localeEn` in `app.config.ts` registriert; `ng extract-i18n` → 201 Strings (inkl. Photo-Upload-Strings)

---

## Session 8 – Vitest-Unit-Tests (2026-04-04)

- [x] **ng test Fix:** i18n-Konfig korrigiert (`de` war doppelt als `sourceLocale` und in `locales`); `de`-Eintrag aus `locales` entfernt, `sourceLocale` als Objekt mit `baseHref: "/"` konfiguriert
- [x] **ng test Fix:** `angular.json` Testoptionen ergänzt (`tsConfig: tsconfig.spec.json`, `setupFiles: test-setup.ts`)
- [x] **Zoneless API:** Alle 14 Spec-Dateien von `provideExperimentalZonelessChangeDetection` → `provideZonelessChangeDetection` migriert
- [x] **test-setup.ts:** `localStorage`-Mock hinzugefügt (ThemeService-Kompatibilität in allen Test-Umgebungen)
- [x] **StatsService:** 20 echte Unit-Tests für `getMonthStats`, `getYearStats`, `dashboardStats`, `budgetAlerts` (Signal-basierte Mocks, kein Supabase-Aufruf)
- [x] **ReadingsForm:** 18 echte Unit-Tests für `consumptionPreview`, `previousReading`, `nextReading`, `minValue`, `maxValue`, `isSaveDisabled` (vollständige Service-Mocks)
- [x] **cost-preview.spec.ts:** Basistest ergänzt (war leere Datei → "No test suite found"-Fehler)
- [x] **tariff-history.spec.ts:** `archived`-Feld entfernt (existiert nicht in MeterConfig); `component.meter =` → `fixture.componentRef.setInput('meter', ...)` für Signal-Input
- [x] **meter-detail.spec.ts:** `params: of({ id: '1' })` zum ActivatedRoute-Mock hinzugefügt (MeterDetailStateService braucht `route.params` als Observable für `toSignal`)
- [x] **Gesamtergebnis:** 15/15 Suiten ✓ · 53/53 Tests ✓ (vorher: 15 Smoke-Tests)

---

## Offene Aufgaben

Alle Aufgaben vollständig implementiert. ✅

> **Alle Aufgaben vollständig implementiert:** Unit-Tests (53/53) und E2E-Tests (31/31) grün. ✅

---

## Session 9 – Playwright E2E-Tests (2026-04-04)

### Strategie: Supabase-Netzwerk-Mocking

Alle Supabase-API-Aufrufe werden via `page.route()` abgefangen — keine echte DB nötig, Tests laufen deterministisch in CI.

- [x] **Installation:** `@playwright/test` + Chromium-Browser-Binary installiert
- [x] **`playwright.config.ts`:** `baseURL: localhost:4200`, `webServer: ng serve`, Chromium, `reuseExistingServer: true`
- [x] **`e2e/helpers/fixtures.ts`:** Statische Mock-Daten (User, Session, 2 Zähler, 2 Ablesungen, New-Meter, New-Reading)
- [x] **`e2e/helpers/supabase-mock.ts`:** Wiederverwendbare Route-Interceptors + **`mockAuthenticatedApp()`** (kombiniert localStorage-Injektion + alle API-Mocks)
- [x] **`e2e/auth.spec.ts`** (9 Tests): Login-Redirect, Felder sichtbar, erfolgreicher Login → Dashboard, fehlgeschlagener Login → Alert, Passwort-Toggle, Submit-Deaktivierung, Register-Modus, Logout-Button, Logout → Auth
- [x] **`e2e/meters.spec.ts`** (8 Tests): Zähler-Liste, Empty-State, Zähler-Anlegen-Formular, Typ-Auswahl, Validierung, erfolgreiche Anlage → Redirect, Sidebar-NavLink aktiv
- [x] **`e2e/readings.spec.ts`** (14 Tests): Ablesungs-Liste, Empty-State, Ablesung-Form, Zähler-Auswahl, Validierung, Konsumvorschau, Negativ-Verbrauch, erfolgreiche Ablesung → Redirect, **kritischer E2E-Flow** (Login → Dashboard → Readings → Neue Ablesung → Speichern)
- [x] **`package.json`:** Scripts `e2e`, `e2e:ui`, `e2e:debug` ergänzt

## Session 10 – E2E Auth-Fix & Vollständige 31/31-Abdeckung (2026-04-05)

### Root Cause: Supabase liest localStorage vor HTTP-Calls

`getSession()` im Supabase-JS-Client prüft localStorage zuerst — im leeren Browser-Kontext keine HTTP-Call → Auth-Guard sieht `null` → Redirect zu `/auth`.

**Lösung:** `page.addInitScript()` injiziert den Token in localStorage BEVOR Angular lädt:

```ts
await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
  key: 'sb-tlymwvtommzdcnpezohz-auth-token',
  value: JSON.stringify(sessionData),
});
```

### Weitere Fixes dieser Session

- **Strict-Mode-Violations:** 2 Buttons mit `aria-label="Abmelden"` → `.first()` verwenden
- **Button-Texte:** "Neue Ablesung" → "Ablesung erfassen"; "Speichern" → `.save-btn` (isEdit=false → "Zähler anlegen")
- **Disabled-Button-Validation:** Click auf disabled submit → Blur-Ansatz (`press('Tab')`)
- **PATCH-Mock:** `recalculateAllReadingsForMeter()` macht `PATCH /rest/v1/readings*` → `mockGetReadings` mockt PATCH mit 204
- **Konsumvorschau-Selektor:** `.consumption-preview, [class*="preview"]` → 7 Elemente → stricty → `.consumption-preview`
- **E2E-Ergebnis: 31/31 Tests grün ✅ (14,7 s)**

---

## i18n-Status

| Datei                           | Template `i18n` | TS `$localize` |
| ------------------------------- | --------------- | -------------- |
| `auth.html` / `auth.ts`         | ✅              | ✅             |
| `dashboard.html`                | ✅              | –              |
| `settings.html` / `settings.ts` | ✅              | ✅             |
| `reports.html`                  | ✅              | –              |
| `meters.html` / `meters.ts`     | ✅              | ✅             |
| `readings.html` / `readings.ts` | ✅              | ✅             |
| `meter-form.html` / `.ts`       | ✅              | ✅             |
| `readings-form.html` / `.ts`    | ✅              | ✅             |
| `app.ts` (navItems)             | –               | ✅             |
| `tariff-form.ts`                | –               | ✅             |
| `meter-tariffs.ts`              | –               | ✅             |
| `meter-readings.ts`             | –               | ✅             |
| `src/locale/messages.xlf`       | 201 Strings     | generiert ✅   |
| `src/locale/messages.en.xlf`    | 201 Strings EN  | übersetzt ✅   |

---

## Nächster Fokus

> **Alle Features implementiert, alle Sprachen übersetzt, 31/31 E2E-Tests grün.** Das Projekt ist produktionsbereit.

---

## Session 17 – OCR Zählerfotos (2026-04-05)

### On-Device Texterkennung via Tesseract.js

- [x] `tesseract.js` installiert (0 vulnerabilities, WASM-basiert, kein API-Key)
- [x] `core/services/ocr.service.ts` erstellt:
  - `recognizeMeterValue(file: File): Promise<OcrResult>` – lazy-importiert Tesseract WASM nur bei erstem Aufruf
  - `extractMeterReading(text)` – Regex für Zählerstände (4–8 Stellen, Komma oder Punkt als Dezimaltrenner)
  - Gibt `{ value, confidence, rawText }` zurück; wählt bei mehreren Kandidaten den größten Wert
- [x] `ReadingsForm`: OCR-Integration im Foto-Abschnitt
  - Nach Foto-Auswahl: „Zählerstand erkennen"-Button mit Lade-Spinner
  - OCR läuft On-Device (kein Server-Request)
  - Ergebnis-Box: erkannter Wert, Konfidenz-Prozent, „Übernehmen"- und „Verwerfen"-Button
  - Fehlerfall: Snackbar-Meldung
  - Foto-Auswahl oder Entfernen reset OCR-Ergebnis automatisch
- [x] i18n: 9 neue `trans-unit`s (`readingsForm.ocr.*`) in DE + EN
- [x] TypeScript: 0 Fehler

---

## Session 16 – CO₂-Emissionsfaktoren & PWA-Install (2026-04-05)

### Jahresvergleich-Bugfix (YoY)

- [x] `yearOverYearDiff` in `DashboardStateService` korrigiert: Vorjahr wird nur bis zum gleichen Monat summiert wie das aktuelle Jahr (`maxMonth` aus tatsächlichen Daten ermittelt)
- [x] Rückgabeobjekt um `upToMonth` erweitert
- [x] Dashboard-Chip zeigt nun Zeitraum: „(Jan–Mär)" via `monthShort(month)` Helper

### CO₂-Emissionsfaktoren – DB-gestützt, editierbar (Session 16c)

_Marktpreisvergleich-Feature vollständig entfernt (war unerwünscht). Stattdessen: editierbare CO₂-Faktoren._

- [x] **Entfernt:** `market-prices.constants.ts`, `market-price.service.ts`, Migration `market_prices`, Reports-KPI, Settings-Sektion
- [x] `supabase/migrations/20240103000000_co2_factors.sql`: Tabelle `co2_factors` (pro User, RLS, `factor_kg_per_unit`, `unit`, `source`, `source_url`, `valid_from`)
- [x] `core/services/co2-factor.service.ts` erstellt:
  - `factors = resource<Co2FactorRow[], ...>({ params, loader, defaultValue: [] })` – lädt aus Supabase; Fallback auf `CO2_FACTORS`-Konstante
  - `getFactor(energyType)` – DB-Wert oder Fallback
  - `getEntryForType(type)` – für Settings-Template: `{ factor, unit, source, sourceUrl, isDefault }`
  - `upsert(row)` / `remove(id)` – schreiben + reloadTrigger-Signal
  - `CO2_DEFAULT_SOURCE_URLS` – UBA/AGFW-Links als Vorschlag
  - `CO2_SUPPORTED_TYPES` – alle editierbaren Energietypen
- [x] `SupabaseService`: `getCo2Factors()`, `upsertCo2Factor()`, `deleteCo2Factor()` ergänzt
- [x] Settings: neue Sektion „CO₂-Emissionsfaktoren" mit editierbaren Faktorzeilen
  - Jeder Energietyp zeigt aktuellen Faktor, Quelle (als klickbarer Link), „Standard (UBA)"-Badge
  - Inline-Formular: Faktor, Quelle, Quellen-URL; negative Werte erlaubt (Solar-Gutschrift)
  - Speichern → upsert in DB; „Auf UBA-Standard zurücksetzen" → DB-Eintrag löschen
- [x] i18n: 14 neue `trans-unit`s (`settings.co2Factors.*`) in DE + EN
- [x] TypeScript: 0 Fehler

### PWA-Install-Prompt

- [x] `core/services/pwa-install.service.ts` erstellt (Signals, iOS-Erkennung)
- [x] Settings: PWA-Installationssektion (3 Zustände: installed / canInstall / iOS-Anleitung)
- [x] i18n: 10 Template-Strings + 1 `$localize`-String (DE + EN)

---

## Session 15 – Jahresvergleich Dashboard & CSV-Import (2026-04-05)

### Jahresvergleich Dashboard

- [x] `DashboardStateService.yearOverYearDiff` als `computed` Signal: vergleicht `totalYearCostWithBase()` mit `getYearTotalCost(year - 1)`
  - Gibt `{ percent, prevYear }` zurück oder `null` wenn kein Vorjahr vorhanden
- [x] Dashboard: Jahresvergleich-Chip unter dem Gesamtkosten-Wert (grün wenn günstiger, rot wenn ≥ 5% teurer)
  - Format: „−3,2 % ggü. 2024" / „+7,1 % ggü. 2024"
  - `trending_down` oder `trending_up` Material-Icon
- [x] Dashboard SCSS: `.yoy-chip` Styles (Pill-Badge, grün/rot, responsive)
- [x] i18n: 2 neue `trans-unit`s (`dashboard.yoy.cheaper`, `dashboard.yoy.costlier`) in DE + EN

### CSV-Import

- [x] `papaparse` + `@types/papaparse` installiert (0 vulnerabilities)
- [x] `CsvImportService` (`core/services/csv-import.service.ts`) erstellt:
  - `parseFile(file)`: papaparse mit Header-Erkennung, flexible Spaltennamen (datum/date, wert/value, notiz/note)
  - `parseDate()`: ISO `YYYY-MM-DD`, DE `DD.MM.YYYY`, DE kurz `DD.MM.YY`
  - `markDuplicates()`: vergleicht mit bestehenden Ablesungen des gewählten Zählers
  - `importRows()`: Batch-Insert via `ReadingService.addReading()`, überspringt Duplikate + Fehler
- [x] `CsvImportDialogComponent` (`shared/components/csv-import-dialog/`) erstellt:
  - Drag-&-Drop-Zone + Datei-Auswahl-Button
  - Zähler-Auswahl via Chip-Buttons (farbig, mit Meter-Icon)
  - Vorschau-Tabelle: alle CSV-Zeilen mit Status (✅ OK / ⚠️ Duplikat / ❌ Fehler)
  - Tooltips bei Fehlern (Datum-/Wert-Validierung, Negativ-Wert)
  - Import-Button zeigt Anzahl importierbarer Zeilen
- [x] Settings: neuer „CSV importieren"-Eintrag in der Datenverwaltungs-Sektion
- [x] i18n: 26 neue `trans-unit`s für alle CSV-Dialog- und Service-Strings (DE + EN)
- [x] TypeScript: 0 Fehler (strict mode)

---

## Session 14 – CO₂-Tracking & PDF-Export (2026-04-05)

### CO₂-Tracking

- [x] `CO2_FACTORS`-Konstante in `energy.models.ts` (Quelle: UBA 2024, kg CO₂ pro Verbrauchseinheit)
  - Strom: 0,380 kg/kWh · Gas: 2,020 kg/m³ · Heizöl: 2,680 kg/L · Fernwärme: 75 kg/MWh · Solar: −0,050 kg/kWh (Gutschrift)
- [x] `MeterSummary.co2Kg` in `StatsService.getMeterSummary()` berechnet und zurückgegeben
- [x] `DashboardStateService.totalYearCo2Kg` als `computed` Signal (Summe aller aktiven Zähler)
- [x] Dashboard: neue CO₂-Summary-Karte (grün, `eco`-Icon); CO₂-Zeile auf jeder Meter-Card
- [x] Reports: CO₂-Gesamtkarte im KPI-Grid; CO₂-Zeile je Zähler-KPI-Card mit Hinweis auf UBA-2024
- [x] i18n: 6 neue `trans-unit`s (DE + EN)

### PDF-Export

- [x] `jspdf` + `jspdf-autotable` installiert
- [x] `PdfExportService` (`core/services/pdf-export.service.ts`) erstellt:
  - Blauen Header (Apple Blue) mit App-Name, Jahr und Erstellungsdatum
  - Gesamtkosten und Gesamtemissionen als Textzusammenfassung
  - Zähler-Übersichtstabelle (Name, Typ, Verbrauch, Einheit, Kosten, CO₂)
  - Monatsdetail-Tabelle je Zähler (Monat, Verbrauch, Einheit, Kosten, CO₂)
  - Seitenangabe im Footer
  - Dateiname: `MeterFlow-{Jahr}.pdf`
- [x] Reports: „PDF exportieren"-Button neben dem Jahr-Select; ruft `pdfExport.exportYearReport(year)` auf
- [x] i18n: 15 neue `trans-unit`s für `pdf.*`-Strings (DE + EN)

---

## Session 13 – Ableseerinnerung / Push-Notifications (2026-04-05)

- [x] `NotificationService` (`core/services/notification.service.ts`) erstellt
  - `permission` Signal (granted / denied / default)
  - `enabled` Signal (persistiert in `localStorage`)
  - `requestPermission()` – fragt Browser-Permission an, setzt `enabled = true`
  - `setEnabled()` – Toggle mit Permission-Request bei Erstaktivierung
  - `checkAndShowReminder()` – prüft beim App-Start ob ≥ 28 Tage seit letztem Reminder
  - `showTestNotification()` – sofortiger Test aus den Settings
  - `showNotification()` – via `ServiceWorkerRegistration.showNotification()` (Fallback: `new Notification()`)
  - Timestamp des letzten Reminders wird in `localStorage` (`mf_reminder_last`) gespeichert
- [x] `app.ts` – `checkAndShowReminder()` im Konstruktor aufgerufen
- [x] `settings.html` / `settings.ts` – neuer Abschnitt „Benachrichtigungen":
  - `mat-slide-toggle` aktiviert/deaktiviert den Reminder
  - Status-Text: blockiert / aktiv / inaktiv
  - Test-Button (nur sichtbar wenn aktiv)
- [x] i18n: 12 neue `trans-unit`s in `messages.xlf` + `messages.en.xlf`
  - `settings.notifications.*` (8 Template-Strings)
  - `notification.reminder.title/body` (2 `$localize`-Strings)

---

## Session 12 – PWA & Budget-UI (2026-04-05)

### PWA (Progressive Web App)

- [x] `@angular/pwa@21.2.6` via `ng add` installiert
- [x] `ngsw-worker.js` via `provideServiceWorker()` in `app.config.ts` registriert (nur Production)
- [x] `public/manifest.webmanifest`: Name, Beschreibung, `theme_color: #007AFF`, `background_color: #F5F5F7`, Kategorien, Sprachattribut
- [x] `ngsw-config.json`: `updateMode: prefetch` für App-Assets; `dataGroups` für Supabase REST API (`freshness`, 1 h) und Auth-Endpunkt (`freshness`, 10 min)
- [x] App-Icons (72–512 px) generiert und in `public/icons/` abgelegt

### Budget-UI

- [x] `budgetAlerts` aus `StatsService` in `DashboardStateService` exponiert
- [x] Budget-Warnbanner zwischen Dashboard-Header und Summary-Cards (orange / rot je nach Schwere)
- [x] Progress-Bar im Warnbanner zeigt Ausschöpfung in %
- [x] Rotes/oranges Budget-Badge-Icon auf Meter-Cards mit aktivem Alert
- [x] i18n: 8 neue `trans-unit`s in `messages.xlf` und `messages.en.xlf`

---

## Session 11 – Fernwärme-Preismodell & Roadmap (2026-04-05)

### Fernwärme-Abrechnung implementiert

Dreiteiliger Fernwärme-Preis vollständig umgesetzt:

| Komponente                | Feld                                     | Beispiel            |
| ------------------------- | ---------------------------------------- | ------------------- |
| Grundpreis (GP)           | `annualBasePrice`                        | 741,52 €/Jahr       |
| Bereitstellungspreis (BP) | `basePricePerKw` + `capacityThresholdKw` | 51,54 €/kW ab 15 kW |
| Arbeitspreis (AP)         | `pricePerUnit`                           | 126,35 €/MWh        |

**Formel:** `Kosten = (GP + max(0, Anschlussleistung − Freigrenze) × BP) / 365 × Tage + Verbrauch_MWh × AP`

- [x] Einheit Fernwärme: `kWh` → **`MWh`**
- [x] `TariffPeriod`: `annualBasePrice`, `capacityThresholdKw` neu; `basePricePerKw` bereits vorhanden
- [x] `MeterConfig`: `connectedLoadKw` (Bereitstellungsleistung je Zähler, z.B. 7,99 kW)
- [x] `reading.service.ts`: Fernwärme-Branch in `addReading()` + `recalculateAllReadingsForMeter()`
- [x] `tariff-form`: Felder GP, BP/kW, Freigrenze, Emissionspreis
- [x] `meter-form`: Abschnitt „Fernwärme-Parameter" mit Bereitstellungsleistung
- [x] `cost-preview`: anteilige Fixkosten + Arbeitspreis korrekt berechnet

### CI/CD – GitHub Workflow erweitert

- [x] `test`-Job: `npm test -- --run` (Vitest, Node 22) als Pipeline-Gate
- [x] `e2e`-Job: Playwright Chromium, Artifact-Upload bei Fehler
- [x] `build-and-push`: `needs: [test, e2e]` – Image wird nur bei grünen Tests gepusht

---

## Session 18 – FastAPI Backend (2026-06-06)

### Architektur-Entscheidung: Von Supabase zu eigenem Backend

Supabase wird vollständig abgelöst durch:

- FastAPI 0.115+ als REST-API-Backend
- SQLAlchemy 2.0 async + asyncpg auf eigenem PostgreSQL 17 Container
- Eigenes JWT-Auth-System mit HttpOnly Cookies (keine localStorage-Tokens)
- MinIO als S3-kompatibler Foto-Storage

### Implementierungsfortschritt

- [x] `backend/` Projektstruktur angelegt (`pyproject.toml`, `src/meterflow/`)
- [x] `config.py` + `database.py` (Fundament)
- [x] Alembic + `001_initial_schema.py` (users, refresh_tokens, meters, readings, co2_factors)
- [x] SQLAlchemy ORM-Models (user, refresh_token, meter, reading, co2_factor)
- [x] Auth-System: register, login, refresh, logout (HttpOnly Cookies)
- [x] Repositories (meter, reading, co2_factor)
- [x] Services (tariff, reading, co2, stats, budget)
- [x] Routers (auth, meters, readings, co2_factors, stats)
- [x] main.py + Dockerfile + docker-compose.yml
- [x] Integrationstests (pytest OOP + Allure)
- [ ] Angular: Supabase SDK entfernen, eigener AuthService + withCredentials

### Migrations-Plan (Angular-Seite)

1. `@supabase/supabase-js` entfernen
2. `SupabaseService` → eigener `ApiService` (HttpClient + withCredentials)
3. `AuthService` auf `/api/v1/auth/*` umschreiben
4. `authGuard` → prüft Cookie via `GET /api/v1/auth/me`
5. HTTP-Interceptor: 401 → stilles Refresh → Retry

---

## Feature-Roadmap

Priorisierte Vorschläge für künftige Versionen:

### 🔴 Prio 1 – Hoher Impact, wenig Aufwand

| Feature              | Beschreibung                                                                  | Status      |
| -------------------- | ----------------------------------------------------------------------------- | ----------- |
| **PWA**              | `ng add @angular/pwa` – installierbar, Offline-Modus, Push-Benachrichtigungen | ✅ erledigt |
| **Budget-UI**        | Rote Badges + Warnbanner im Dashboard (Modell `BudgetConfig` bereits fertig)  | ✅ erledigt |
| **Ableseerinnerung** | Monatliche Push-Notification via PWA: „Zeit für den Zählerstand!"             | ✅ erledigt |

### 🟡 Prio 2 – Mittlerer Impact, mittlerer Aufwand

| Feature                       | Beschreibung                                                           | Status      |
| ----------------------------- | ---------------------------------------------------------------------- | ----------- |
| **PDF-Export**                | Abrechnungsbericht als PDF (für Vermieter, Steuer, Archiv)             | ✅ erledigt |
| **CO₂-Tracking**              | Emissionsfaktoren je Energietyp → kgCO₂-Anzeige im Dashboard           | ✅ erledigt |
| **Jahresvergleich Dashboard** | „Dieses Jahr X % günstiger als letztes Jahr" direkt auf der Startseite | ✅ erledigt |
| **CSV-Import**                | Zählerstände aus Excel/CSV importieren (für Wechsler mit Altdaten)     | ✅ erledigt |

### 🟢 Prio 3 – Differenziatoren, höherer Aufwand

| Feature                   | Beschreibung                                                             | Status      |
| ------------------------- | ------------------------------------------------------------------------ | ----------- |
| **CO₂-Emissionsfaktoren** | Editierbare UBA-Faktoren pro Energietyp, DB-gestützt, mit Quellen-Link   | ✅ erledigt |
| **Homescreen-Widget**     | PWA-Shortcut / iOS-Widget mit letztem Zählerstand                        | ✅ erledigt |
| **OCR Zählerfotos**       | Zählerstand automatisch aus Foto auslesen (Google Vision / On-Device ML) | ✅ erledigt |
