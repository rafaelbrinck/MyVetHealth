import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginTutor } from './login-tutor';

describe('LoginTutor', () => {
  let component: LoginTutor;
  let fixture: ComponentFixture<LoginTutor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginTutor],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginTutor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
