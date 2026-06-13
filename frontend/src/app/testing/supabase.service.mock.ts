import { signal } from '@angular/core';
import { vi } from 'vitest';
import { SupabaseService } from '../core/services/supabase.service';

export function createSupabaseMock(): Partial<SupabaseService> {
  return {
    connectionStatus: signal('connected'),
    currentUser: signal(null),
    sessionReady: Promise.resolve(),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    getMeters: vi.fn().mockResolvedValue([]),
    addMeter: vi.fn().mockResolvedValue({}),
    updateMeter: vi.fn().mockResolvedValue(undefined),
    deleteMeter: vi.fn().mockResolvedValue(undefined),
    getReadings: vi.fn().mockResolvedValue([]),
    addReading: vi.fn().mockResolvedValue({}),
    updateReading: vi.fn().mockResolvedValue(undefined),
    deleteReading: vi.fn().mockResolvedValue(undefined),
    recalculateReadings: vi.fn().mockResolvedValue([]),
    uploadPhoto: vi.fn().mockResolvedValue(''),
    getSignedPhotoUrl: vi.fn().mockResolvedValue(''),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    getCo2Factors: vi.fn().mockResolvedValue({ data: [], error: null }),
    upsertCo2Factor: vi.fn().mockResolvedValue(undefined),
    deleteCo2Factor: vi.fn().mockResolvedValue(undefined),
    checkConnection: vi.fn().mockResolvedValue(undefined),
  };
}
