import { TestBed } from '@angular/core/testing';

import { ServicosClinica } from './servicos-clinica';

describe('ServicosClinica', () => {
  let service: ServicosClinica;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicosClinica);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
