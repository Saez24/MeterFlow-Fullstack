import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TariffHistory } from './tariff-history';

describe('TariffHistory', () => {
  let component: TariffHistory;
  let fixture: ComponentFixture<TariffHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TariffHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(TariffHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
