// ============================================================
// sidebar.spec.ts — CORREGIDO
// ============================================================
// PROBLEMA: usaba una clase Sidebar vacía local en lugar de
//           SidebarComponent real, y faltaban providers.
// CORRECCIÓN: importar SidebarComponent correctamente.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SidebarComponent } from './sidebar';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar nombreUsuario desde localStorage en ngOnInit', () => {
    localStorage.setItem('usuario', 'capitán_test');
    localStorage.setItem('rol', 'ADMINISTRADOR');
    component.ngOnInit();
    expect(component.nombreUsuario).toBe('capitán_test');
    expect(component.rolUsuario).toBe('ADMINISTRADOR');
    localStorage.clear();
  });
});