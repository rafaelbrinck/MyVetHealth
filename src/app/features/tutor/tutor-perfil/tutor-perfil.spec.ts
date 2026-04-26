import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorPerfil } from './tutor-perfil';

describe('TutorPerfil', () => {
  let component: TutorPerfil;
  let fixture: ComponentFixture<TutorPerfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorPerfil],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorPerfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
