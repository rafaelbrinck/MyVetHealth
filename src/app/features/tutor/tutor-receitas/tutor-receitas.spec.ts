import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorReceitas } from './tutor-receitas';

describe('TutorReceitas', () => {
  let component: TutorReceitas;
  let fixture: ComponentFixture<TutorReceitas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorReceitas],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorReceitas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
