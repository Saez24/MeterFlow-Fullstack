import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { createSupabaseMock } from '../../testing/supabase.service.mock';


describe('Supabse', () => {
  let service: Partial<SupabaseService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SupabaseService, useValue: createSupabaseMock() },
      ],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
