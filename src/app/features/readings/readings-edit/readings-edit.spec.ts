import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadingsEdit } from './readings-edit';

describe('ReadingsEdit', () => {
  let component: ReadingsEdit;
  let fixture: ComponentFixture<ReadingsEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingsEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
