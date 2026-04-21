import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaDetalhes } from './consulta-detalhes';

describe('ConsultaDetalhes', () => {
  let component: ConsultaDetalhes;
  let fixture: ComponentFixture<ConsultaDetalhes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaDetalhes],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultaDetalhes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
