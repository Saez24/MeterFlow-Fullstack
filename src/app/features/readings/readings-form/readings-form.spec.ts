import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadingsForm } from './readings-form';

describe('ReadingsForm', () => {
  let component: ReadingsForm;
  let fixture: ComponentFixture<ReadingsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingsForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
