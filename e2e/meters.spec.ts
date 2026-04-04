import { test, expect } from '@playwright/test';
import { mockAuthenticatedApp } from './helpers/supabase-mock';
import { MOCK_METERS, MOCK_NEW_METER } from './helpers/fixtures';

const SUPABASE_URL = 'https://tlymwvtommzdcnpezohz.supabase.co';

// ── Zähler-Liste ──────────────────────────────────────────────────────────────
test.describe('Zähler – Liste', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuthenticatedApp(page);
        await page.goto('/meters');
        await page.waitForURL(/\/meters/);
    });

    test('zeigt alle gemockten Zähler', async ({ page }) => {
        for (const meter of MOCK_METERS) {
            await expect(page.getByText(meter.name)).toBeVisible();
        }
    });

    test('zeigt Zähler-Typ-Chip und Provider', async ({ page }) => {
        // Strom-Zähler
        await expect(page.getByText('Stadtwerke').first()).toBeVisible();
    });

    test('leere Liste zeigt Empty-State', async ({ page }) => {
        await mockAuthenticatedApp(page, { meters: [] });
        await page.goto('/meters');
        await page.waitForURL(/\/meters/);
        await expect(page.getByText('Noch keine Zähler')).toBeVisible();
    });

    test('"Neuer Zähler"-Button vorhanden', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Neuer Zähler/i })).toBeVisible();
    });

    test('Klick auf Zähler öffnet Detail-Seite', async ({ page }) => {
        await page.getByText(MOCK_METERS[0].name).click();
        await expect(page).toHaveURL(new RegExp(`/meters/${MOCK_METERS[0].id}`));
    });
});

// ── Zähler anlegen ────────────────────────────────────────────────────────────
test.describe('Zähler – Anlegen', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuthenticatedApp(page);
        await page.goto('/meters');
        await page.waitForURL(/\/meters/);
    });

    test('navigiert zum Formular bei "Neuer Zähler"', async ({ page }) => {
        await page.getByRole('button', { name: /Neuer Zähler/i }).click();
        await expect(page).toHaveURL(/\/meters\/new/);
        await expect(page.getByText('Neuer Zähler')).toBeVisible();
    });

    test('Typ-Auswahl wechselt aktive Klasse', async ({ page }) => {
        await page.goto('/meters/new');
        await page.waitForURL(/\/meters\/new/);

        // Gas-Typ auswählen
        await page.getByRole('button', { name: /Gas/i }).click();
        await expect(page.getByRole('button', { name: /Gas/i })).toHaveClass(/type-btn--active/);
    });

    test('Formular-Validierung: Name ist Pflichtfeld', async ({ page }) => {
        await page.goto('/meters/new');
        await page.waitForURL(/\/meters\/new/);

        // Name-Feld antippen und leer lassen -> required-Fehler triggern
        await page.locator('input[formControlName="name"]').click();
        await page.locator('input[formControlName="name"]').press('Tab');

        await expect(page.getByText('Bitte einen Namen eingeben')).toBeVisible();
    });

    test('erfolgreiche Zähler-Anlage navigiert zur Liste', async ({ page }) => {
        // POST-Mock für create
        await page.route(`${SUPABASE_URL}/rest/v1/meters*`, async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify(MOCK_NEW_METER),
                });
            } else if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([...MOCK_METERS, MOCK_NEW_METER]),
                });
            } else {
                await route.continue();
            }
        });

        await page.goto('/meters/new');
        await page.waitForURL(/\/meters\/new/);

        // Strom-Typ wählen
        await page.getByRole('button', { name: /Strom/i }).first().click();

        // Name eingeben
        await page.locator('input[formControlName="name"]').fill('Testzähler E2E');
        await page.locator('input[formControlName="provider"]').fill('Test-Anbieter');

        // Speichern
        // Zähler anlegen (Button-Text bei neuem Zähler ist "Zähler anlegen")
        await page.locator('.save-btn').click();

        // Zurück zur Zähler-Liste
        await expect(page).toHaveURL(/\/meters$/, { timeout: 8000 });
    });
});

// ── Navigation ────────────────────────────────────────────────────────────────
test.describe('Zähler – Navigation', () => {
    test('Sidebar-Link "Zähler" ist aktiv auf /meters', async ({ page }) => {
        await mockAuthenticatedApp(page);
        await page.goto('/meters');
        await page.waitForURL(/\/meters/);
        const navLink = page.locator('.nav-item[href="/meters"]');
        await expect(navLink).toHaveClass(/nav-item--active/);
    });
});
