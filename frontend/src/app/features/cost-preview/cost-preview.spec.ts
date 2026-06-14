import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CostPreview } from './cost-preview';
import { ApiService } from '../../core/services/api.service';
import { createApiServiceMock } from '../../testing/api.service.mock';

describe('CostPreview', () => {
    let component: CostPreview;
    let fixture: ComponentFixture<CostPreview>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CostPreview],
            providers: [
                provideZonelessChangeDetection(),
                { provide: ApiService, useValue: createApiServiceMock() },
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