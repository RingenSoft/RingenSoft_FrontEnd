import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginResponse } from './api.service';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegistroData {
  username: string;
  password: string;
  nombre_completo: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('usuario', response.nombre);
        localStorage.setItem('rol', response.rol);
        localStorage.setItem('id_usuario', String(response.id_usuario));
        if (response.zona_habitual) {
          localStorage.setItem('zona_habitual', response.zona_habitual);
        }
      })
    );
  }

  registro(datos: RegistroData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/registro`, datos);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('token');
  }

  getUsuarioActual(): string | null {
    return localStorage.getItem('usuario');
  }

  getIdUsuario(): string | null {
    return localStorage.getItem('id_usuario');
  }

  getZonaHabitual(): string {
    return localStorage.getItem('zona_habitual') ?? 'CHIMBOTE';
  }
}
