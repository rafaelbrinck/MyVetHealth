import { TestBed } from '@angular/core/testing';

import { GuestGuard } from './guest.guard';

describe('GuestGuard', () => {
  let service: GuestGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuestGuard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
