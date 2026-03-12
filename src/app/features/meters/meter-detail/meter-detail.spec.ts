import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDetail } from './meter-detail';

describe('MeterDetail', () => {
  let component: MeterDetail;
  let fixture: ComponentFixture<MeterDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeterDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(MeterDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
