import { test, expect } from '@playwright/test';
import { mockSuccessfulLogin, mockFailedLogin, mockNoSession, mockGetMeters, mockGetReadings, mockLogout, mockAuthenticatedApp } from './helpers/supabase-mock';

test.describe('Auth – Login & Logout', () => {
    test.beforeEach(async ({ page }) => {
        // Keine aktive Session → App leitet zur Auth-Seite
        await mockNoSession(page);
        await page.goto('/');
    });

    test('leitet unauthentifizierte Nutzer zur Login-Seite', async ({ page }) => {
        await expect(page).toHaveURL(/\/auth/);
        await expect(page.getByText('Willkommen zurück')).toBeVisible();
    });

    test('zeigt E-Mail- und Passwort-Felder', async ({ page }) => {
        await page.waitForURL(/\/auth/);
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('erfolgreicher Login leitet zum Dashboard', async ({ page }) => {
        await page.waitForURL(/\/auth/);

        await mockSuccessfulLogin(page);
        await mockGetMeters(page);
        await mockGetReadings(page);

        await page.locator('input[type="email"]').fill('test@meterflow.de');
        await page.locator('input[type="password"]').fill('test1234');
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
    });

    test('fehlgeschlagener Login zeigt Fehlermeldung', async ({ page }) => {
        await page.waitForURL(/\/auth/);
        await mockFailedLogin(page);

        await page.locator('input[type="email"]').fill('falsch@example.com');
        await page.locator('input[type="password"]').fill('falsches-passwort');
        await page.locator('button[type="submit"]').click();

        // Fehlermeldung muss erscheinen (role="alert")
        await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    });

    test('Passwort-Sichtbarkeit umschalten', async ({ page }) => {
        await page.waitForURL(/\/auth/);
        const passwordInput = page.locator('input[type="password"]').first();
        const toggleBtn = page.locator('button[mat-icon-button][matSuffix]');

        await expect(passwordInput).toHaveAttribute('type', 'password');
        await toggleBtn.click();
        await expect(page.locator('input[type="text"]').first()).toBeVisible();
        await toggleBtn.click();
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test('Submit-Button bei ungültiger E-Mail deaktiviert', async ({ page }) => {
        await page.waitForURL(/\/auth/);
        await page.locator('input[type="email"]').fill('keine-valide-email');
        await page.locator('input[type="password"]').fill('test1234');
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('auf Registrierung wechseln zeigt Passwort-Bestätigen-Feld', async ({ page }) => {
        await page.waitForURL(/\/auth/);
        // "Konto erstellen"-Link anklicken
        await page.getByRole('button', { name: /Registrieren|Konto erstellen/i }).click();
        await expect(page.locator('input[autocomplete="new-password"]')).toBeVisible();
    });
});

test.describe('Auth – Logout', () => {
    test.beforeEach(async ({ page }) => {
        // Eingeloggte Session via localStorage injizieren + alle Mocks aktivieren
        await mockAuthenticatedApp(page);
        await page.goto('/dashboard');
        await page.waitForURL(/\/dashboard/);
    });

    test('Logout-Button in Sidebar vorhanden', async ({ page }) => {
        await expect(page.locator('button[aria-label="Abmelden"]').first()).toBeVisible();
    });

    test('nach Logout zur Login-Seite', async ({ page }) => {
        await mockNoSession(page);
        await page.locator('button[aria-label="Abmelden"]').first().click();
        await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
    });
});
