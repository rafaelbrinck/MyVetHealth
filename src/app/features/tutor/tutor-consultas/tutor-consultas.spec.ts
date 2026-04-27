import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorConsultas } from './tutor-consultas';

describe('TutorConsultas', () => {
  let component: TutorConsultas;
  let fixture: ComponentFixture<TutorConsultas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorConsultas],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorConsultas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
