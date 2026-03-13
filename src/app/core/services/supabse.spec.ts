import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabse.service';


describe('Supabse', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
