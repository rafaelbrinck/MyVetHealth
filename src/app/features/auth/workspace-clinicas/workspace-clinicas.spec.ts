import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceClinicas } from './workspace-clinicas';

describe('WorkspaceClinicas', () => {
  let component: WorkspaceClinicas;
  let fixture: ComponentFixture<WorkspaceClinicas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceClinicas],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceClinicas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
