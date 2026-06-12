// ── Mock-Testdaten für Playwright E2E ────────────────────────────────────────
// Alle IDs und Timestamps sind fest – Tests sind damit deterministisch.

export const MOCK_USER = {
    id: 'test-user-id-123',
    email: 'test@meterflow.de',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
};

export const MOCK_SESSION = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: MOCK_USER,
};

export const MOCK_METERS = [
    {
        id: 'meter-elec-1',
        user_id: 'test-user-id-123',
        name: 'Haushaltsstrom',
        type: 'electricity',
        unit: 'kWh',
        icon: 'bolt',
        color: '#FFD600',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        provider: 'Stadtwerke',
        meter_number: '12345678',
        tariff_history: [
            {
                id: 'tariff-1',
                validFrom: '2024-01-01',
                pricePerUnit: 0.28,
                baseCharge: 9.5,
            },
        ],
        budget: null,
        linked_water_meter_id: null,
        calorific_value: null,
        z_number: null,
        notes: null,
    },
    {
        id: 'meter-gas-1',
        user_id: 'test-user-id-123',
        name: 'Erdgas',
        type: 'gas',
        unit: 'm³',
        icon: 'local_fire_department',
        color: '#FF6D00',
        active: true,
        created_at: '2024-01-02T00:00:00Z',
        provider: 'Gaswerk',
        meter_number: '87654321',
        tariff_history: [
            {
                id: 'tariff-2',
                validFrom: '2024-01-01',
                pricePerUnit: 0.1,
                baseCharge: 12,
                calorificValue: 10.55,
                zNumber: 0.9672,
            },
        ],
        budget: null,
        linked_water_meter_id: null,
        calorific_value: 10.55,
        z_number: 0.9672,
        notes: null,
    },
];

export const MOCK_READINGS = [
    {
        id: 'reading-1',
        user_id: 'test-user-id-123',
        meter_id: 'meter-elec-1',
        value: 12500,
        date: '2024-03-15',
        consumption: 150,
        kwh: 150,
        cost: 42,
        wastewater_cost: null,
        total_cost: 42,
        note: 'Monatliche Ablesung',
        photo: null,
    },
    {
        id: 'reading-2',
        user_id: 'test-user-id-123',
        meter_id: 'meter-elec-1',
        value: 12350,
        date: '2024-02-15',
        consumption: 130,
        kwh: 130,
        cost: 36.4,
        wastewater_cost: null,
        total_cost: 36.4,
        note: null,
        photo: null,
    },
];

// Neue Ablesung, die beim Anlegen zurückgegeben wird
export const MOCK_NEW_READING = {
    id: 'reading-new-1',
    user_id: 'test-user-id-123',
    meter_id: 'meter-elec-1',
    value: 12700,
    date: '2024-04-15',
    consumption: 200,
    kwh: 200,
    cost: 56,
    wastewater_cost: null,
    total_cost: 56,
    note: 'E2E-Test-Ablesung',
    photo: null,
};

// Neuer Zähler, der beim Anlegen zurückgegeben wird
export const MOCK_NEW_METER = {
    id: 'meter-new-1',
    user_id: 'test-user-id-123',
    name: 'Testzähler E2E',
    type: 'electricity',
    unit: 'kWh',
    icon: 'bolt',
    color: '#00BCD4',
    active: true,
    created_at: '2024-04-01T00:00:00Z',
    provider: 'Test-Anbieter',
    meter_number: null,
    tariff_history: [],
    budget: null,
    linked_water_meter_id: null,
    calorific_value: null,
    z_number: null,
    notes: null,
};
