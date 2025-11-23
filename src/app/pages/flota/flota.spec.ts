import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Flota } from './flota';

describe('Flota', () => {
  let component: Flota;
  let fixture: ComponentFixture<Flota>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Flota]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Flota);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
