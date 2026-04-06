import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Prontuario } from './prontuario';

describe('Prontuario', () => {
  let component: Prontuario;
  let fixture: ComponentFixture<Prontuario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prontuario],
    }).compileComponents();

    fixture = TestBed.createComponent(Prontuario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
