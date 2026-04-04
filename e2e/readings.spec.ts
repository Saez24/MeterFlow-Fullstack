import { test, expect } from '@playwright/test';
import {
    mockAuthenticatedApp,
    mockSuccessfulLogin,
    mockGetMeters,
    mockGetReadings,
    mockLogout,
} from './helpers/supabase-mock';
import { MOCK_METERS, MOCK_READINGS, MOCK_NEW_READING } from './helpers/fixtures';

const SUPABASE_URL = 'https://tlymwvtommzdcnpezohz.supabase.co';

// ── Ablesungs-Liste ───────────────────────────────────────────────────────────
test.describe('Ablesungen – Liste', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuthenticatedApp(page);
        await page.goto('/readings');
        await page.waitForURL(/\/readings/);
    });

    test('Seite lädt und zeigt Zählerstand-Werte', async ({ page }) => {
        // Beide Mock-Readings haben Werte aus den Fixtures
        await expect(page.getByText('12.500')).toBeVisible();
    });

    test('"Neue Ablesung"-Button vorhanden', async ({ page }) => {
        // Der Header-Button hat die Klasse .action-btn (nicht der Empty-State-Button)
        await expect(page.locator('button.action-btn')).toBeVisible();
    });

    test('leere Liste zeigt Empty-State', async ({ page }) => {
        await mockAuthenticatedApp(page, { readings: [] });
        await page.goto('/readings');
        await page.waitForURL(/\/readings/);
        await expect(page.getByText(/Keine Ablesungen|Noch keine/i).first()).toBeVisible();
    });
});

// ── Ablesung erfassen ─────────────────────────────────────────────────────────
test.describe('Ablesungen – Neue Ablesung erfassen', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuthenticatedApp(page);
        await page.goto('/readings');
        await page.waitForURL(/\/readings/);
        await page.locator('button.action-btn').click();
        await page.waitForURL(/\/readings\/new/);
    });

    test('zeigt Überschrift "Ablesung erfassen"', async ({ page }) => {
        await expect(page.getByText('Ablesung erfassen')).toBeVisible();
    });

    test('zeigt alle aktiven Zähler zur Auswahl', async ({ page }) => {
        for (const meter of MOCK_METERS.filter((m) => m.active)) {
            await expect(page.getByText(meter.name)).toBeVisible();
        }
    });

    test('Zähler auswählen aktiviert Wert-Eingabe', async ({ page }) => {
        // Strom-Zähler klicken
        await page.getByText(MOCK_METERS[0].name).click();
        await expect(page.locator('input[formControlName="value"]')).toBeVisible();
    });

    test('Formular-Validierung: Wert ist Pflichtfeld', async ({ page }) => {
        await page.getByText(MOCK_METERS[0].name).click();
        // Value-Feld antippen und leer lassen → required-Fehler (submit ist disabled)
        await page.locator('input[formControlName="value"]').click();
        await page.locator('input[formControlName="value"]').press('Tab');
        // Input muss als invalid markiert sein
        await expect(page.locator('input[formControlName="value"].ng-invalid')).toBeVisible();
    });

    test('erfolgreiche Ablesung navigiert zurück zur Liste', async ({ page }) => {
        // Mock für alle readings-Methoden (POST=create, PATCH=recalculate, GET=list)
        await page.route(`${SUPABASE_URL}/rest/v1/readings*`, async (route) => {
            const method = route.request().method();
            if (method === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify(MOCK_NEW_READING),
                });
            } else if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([MOCK_NEW_READING, ...MOCK_READINGS]),
                });
            } else if (method === 'PATCH') {
                // recalculateAllReadingsForMeter macht PATCH für jeden geänderten Wert
                await route.fulfill({ status: 204, body: '' });
            } else {
                await route.continue();
            }
        });

        // Zähler auswählen
        await page.getByText(MOCK_METERS[0].name).click();

        // Wert eingeben (höher als letzter Wert 12500)
        await page.locator('input[formControlName="value"]').fill('12700');

        // Speichern
        await page.locator('button[type="submit"]').click();

        // Zurück zur Ablesungs-Liste
        await expect(page).toHaveURL(/\/readings$/, { timeout: 8000 });
    });

    test('Konsumvorschau wird bei Wert-Eingabe angezeigt', async ({ page }) => {
        await page.getByText(MOCK_METERS[0].name).click();

        // Wert über letzter Ablesung (12500)
        await page.locator('input[formControlName="value"]').fill('12700');

        // Preview-Div wird angezeigt (genau ein .consumption-preview)
        await expect(page.locator('.consumption-preview')).toBeVisible({
            timeout: 3000,
        });
    });

    test('negativer Verbrauch zeigt keine Konsumvorschau', async ({ page }) => {
        await page.getByText(MOCK_METERS[0].name).click();

        // Wert unter letzter Ablesung → consumptionPreview() gibt null zurück → div nicht gerendert
        await page.locator('input[formControlName="value"]').fill('12300');

        await expect(page.locator('.consumption-preview')).not.toBeVisible();
    });

    test('Zurück-Button navigiert ohne Speichern', async ({ page }) => {
        await page.locator('button[mat-icon-button]').first().click();
        await expect(page).toHaveURL(/\/readings/);
    });
});

// ── Kritischer End-to-End-Flow ────────────────────────────────────────────────
test.describe('Kritischer Flow: Login → Ablesung erfassen', () => {
    test('kompletter Flow von Login bis gespeicherte Ablesung', async ({ page }) => {
        // 1. Kein Session (Landing → Auth)
        await page.route(`${SUPABASE_URL}/auth/v1/session`, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ session: null }),
            }),
        );
        await page.goto('/');
        await page.waitForURL(/\/auth/);

        // 2. Login-Mocks aktivieren
        await mockSuccessfulLogin(page);
        await mockGetMeters(page);
        await page.route(`${SUPABASE_URL}/rest/v1/readings*`, async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(MOCK_READINGS),
                });
            } else if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify(MOCK_NEW_READING),
                });
            } else if (route.request().method() === 'PATCH') {
                // recalculateAllReadingsForMeter aktualisiert bestehende Readings
                await route.fulfill({ status: 204, body: '' });
            } else {
                await route.continue();
            }
        });
        await mockLogout(page);

        // 3. Anmelden
        await page.locator('input[type="email"]').fill('test@meterflow.de');
        await page.locator('input[type="password"]').fill('test1234');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/dashboard/, { timeout: 8000 });

        // 4. Zu Ablesungen navigieren
        await page.locator('.nav-item[href="/readings"]').click();
        await page.waitForURL(/\/readings/);

        // 5. Neue Ablesung
        await page.locator('button.action-btn').click();
        await page.waitForURL(/\/readings\/new/);

        // 6. Zähler wählen und Wert eingeben
        await page.getByText(MOCK_METERS[0].name).click();
        await page.locator('input[formControlName="value"]').fill('12700');

        // 7. Speichern → zurück zur Liste
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/\/readings$/, { timeout: 8000 });
    });
});
