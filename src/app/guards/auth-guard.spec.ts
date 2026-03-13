// ============================================================
// auth-guard.spec.ts — CORREGIDO
// ============================================================
// PROBLEMA: importaba desde './auth-guard' (guión), el archivo
//           real se llama auth_guard.ts (guión bajo).
// CORRECCIÓN: importar desde './auth_guard'.

import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard } from './auth_guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('debe redirigir a /login cuando no hay token', () => {
    localStorage.clear();
    // El guard devuelve false (y redirige) si no hay token
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );
    expect(result).toBeFalse();
  });
});