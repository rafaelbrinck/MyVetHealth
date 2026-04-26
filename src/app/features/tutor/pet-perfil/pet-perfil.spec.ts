import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PetPerfil } from './pet-perfil';

describe('PetPerfil', () => {
  let component: PetPerfil;
  let fixture: ComponentFixture<PetPerfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetPerfil],
    }).compileComponents();

    fixture = TestBed.createComponent(PetPerfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
