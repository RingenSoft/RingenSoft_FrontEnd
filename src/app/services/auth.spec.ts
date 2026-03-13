// ============================================================
// auth.spec.ts — CORREGIDO
// ============================================================
// PROBLEMA: importaba 'Auth' (clase que no existe).
// CORRECCIÓN: importar AuthService y proveer HttpClient + Router.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('estaAutenticado() debe retornar false cuando no hay token', () => {
    localStorage.clear();
    expect(service.estaAutenticado()).toBeFalse();
  });

  it('getUsuarioActual() debe retornar null cuando no hay sesión', () => {
    localStorage.clear();
    expect(service.getUsuarioActual()).toBeNull();
  });
});