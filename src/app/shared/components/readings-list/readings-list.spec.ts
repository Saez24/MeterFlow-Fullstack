import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadingsList } from './readings-list';

describe('ReadingsList', () => {
  let component: ReadingsList;
  let fixture: ComponentFixture<ReadingsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingsList],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
