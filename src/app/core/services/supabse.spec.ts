import { TestBed } from '@angular/core/testing';

import { SupabseService } from './supabse.service';

describe('Supabse', () => {
  let service: SupabseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
