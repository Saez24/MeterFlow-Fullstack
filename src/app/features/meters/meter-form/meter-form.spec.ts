import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterForm } from './meter-form';

describe('MeterForm', () => {
  let component: MeterForm;
  let fixture: ComponentFixture<MeterForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeterForm],
    }).compileComponents();

    fixture = TestBed.createComponent(MeterForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
