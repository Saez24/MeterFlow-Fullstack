import { Page } from '@playwright/test';
import { MOCK_USER, MOCK_SESSION, MOCK_METERS, MOCK_READINGS } from './fixtures';

const SUPABASE_URL = 'https://tlymwvtommzdcnpezohz.supabase.co';
const STORAGE_KEY = 'sb-tlymwvtommzdcnpezohz-auth-token';

export type MockMeter = (typeof MOCK_METERS)[number];
export type MockReading = (typeof MOCK_READINGS)[number];

// Setzt den Supabase-Auth-Token in localStorage BEVOR Angular lädt.
async function injectSessionToLocalStorage(page: Page): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const storedSession = {
    access_token: MOCK_SESSION.access_token,
    refresh_token: MOCK_SESSION.refresh_token,
    expires_in: MOCK_SESSION.expires_in,
    expires_at: expiresAt,
    token_type: MOCK_SESSION.token_type,
    user: MOCK_SESSION.user,
  };
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(storedSession) },
  );
}

export async function mockSuccessfulLogin(page: Page): Promise<void> {
  await page.route(`${SUPABASE_URL}/auth/v1/session`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) }),
  );
  await page.route(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) }),
  );
  await page.route(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) }),
  );
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) }),
  );
}

export async function mockFailedLogin(page: Page): Promise<void> {
  await page.route(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
    }),
  );
}

export async function mockNoSession(page: Page): Promise<void> {
  await page.route(`${SUPABASE_URL}/auth/v1/session`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: null }) }),
  );
}

export async function mockLogout(page: Page): Promise<void> {
  await page.route(`${SUPABASE_URL}/auth/v1/logout**`, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
}

export async function mockGetMeters(page: Page, meters: MockMeter[] = MOCK_METERS): Promise<void> {
  await page.route(`${SUPABASE_URL}/rest/v1/meters*`, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(meters) });
    } else {
      route.continue();
    }
  });
}

export async function mockCreateMeter(page: Page, newMeter: MockMeter = MOCK_METERS[0]): Promise<void> {
  await page.route(`${SUPABASE_URL}/rest/v1/meters*`, (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newMeter) });
    } else {
      route.continue();
    }
  });
}

/**
 * Mockt GET und PATCH auf /rest/v1/readings*.
 * PATCH wird von recalculateAllReadingsForMeter nach dem Speichern benötigt.
 */
export async function mockGetReadings(page: Page, readings: MockReading[] = MOCK_READINGS): Promise<void> {
  await page.route(`${SUPABASE_URL}/rest/v1/readings*`, (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(readings) });
    } else if (method === 'PATCH') {
      route.fulfill({ status: 204, body: '' });
    } else {
      route.continue();
    }
  });
}

export async function mockCreateReading(page: Page, newReading: MockReading = MOCK_READINGS[0]): Promise<void> {
  await page.route(`${SUPABASE_URL}/rest/v1/readings*`, (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newReading) });
    } else {
      route.continue();
    }
  });
}

/**
 * Vollständige Mock-Einrichtung für eine eingeloggte App.
 * Muss VOR page.goto() aufgerufen werden.
 */
export async function mockAuthenticatedApp(
  page: Page,
  overrides: { meters?: MockMeter[]; readings?: MockReading[] } = {},
): Promise<void> {
  await injectSessionToLocalStorage(page);
  await mockSuccessfulLogin(page);
  await mockLogout(page);
  await mockGetMeters(page, overrides.meters ?? MOCK_METERS);
  await mockGetReadings(page, overrides.readings ?? MOCK_READINGS);
}
