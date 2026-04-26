import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorDashboard } from './tutor-dashboard';

describe('TutorDashboard', () => {
  let component: TutorDashboard;
  let fixture: ComponentFixture<TutorDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
