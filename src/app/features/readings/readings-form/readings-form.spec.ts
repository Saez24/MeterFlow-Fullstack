import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReadingsForm } from './readings-form';
import { EnergyService } from '../../../core/services/energy.service';
import { SupabaseService } from '../../../core/services/supabse.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('ReadingsForm', () => {
  let component: ReadingsForm;
  let fixture: ComponentFixture<ReadingsForm>;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    await TestBed.configureTestingModule({
      imports: [ReadingsForm, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        EnergyService,
        SupabaseService,
        importProvidersFrom(NoopAnimationsModule),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => null,
              },
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
