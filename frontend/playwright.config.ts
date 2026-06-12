import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E-Konfiguration für MeterFlow.
 *
 * Alle Supabase-Netzwerkaufrufe werden in den Tests über page.route() gemockt,
 * damit die Tests deterministisch laufen ohne echtes Supabase-Projekt.
 *
 * Lokaler Dev-Server: ng serve (Port 4200)
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env['CI'],
    retries: process.env['CI'] ? 2 : 0,
    workers: process.env['CI'] ? 1 : undefined,
    reporter: [['html', { open: 'never' }], ['line']],

    use: {
        baseURL: 'http://localhost:4200',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        // Alle Tests laufen auf Deutsch (de-Standard-Build)
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // ng serve im Hintergrund starten, wenn noch nicht läuft
    webServer: {
        command: 'ng serve --configuration development',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
