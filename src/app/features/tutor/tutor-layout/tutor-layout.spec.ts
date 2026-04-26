import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorLayout } from './tutor-layout';

describe('TutorLayout', () => {
  let component: TutorLayout;
  let fixture: ComponentFixture<TutorLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
