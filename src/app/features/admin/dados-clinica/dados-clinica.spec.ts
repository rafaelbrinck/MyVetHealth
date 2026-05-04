import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DadosClinica } from './dados-clinica';

describe('DadosClinica', () => {
  let component: DadosClinica;
  let fixture: ComponentFixture<DadosClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DadosClinica],
    }).compileComponents();

    fixture = TestBed.createComponent(DadosClinica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
