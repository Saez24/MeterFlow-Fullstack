import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CostPreview } from './cost-preview';
import { SupabaseService } from '../../core/services/supabase.service';
import { createSupabaseMock } from '../../testing/supabase.service.mock';

describe('CostPreview', () => {
    let component: CostPreview;
    let fixture: ComponentFixture<CostPreview>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CostPreview],
            providers: [
                provideZonelessChangeDetection(),
                { provide: SupabaseService, useValue: createSupabaseMock() },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CostPreview);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});