import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorPets } from './tutor-pets';

describe('TutorPets', () => {
  let component: TutorPets;
  let fixture: ComponentFixture<TutorPets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorPets],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorPets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
