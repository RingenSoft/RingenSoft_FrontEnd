import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('usuario', response.nombre);
        localStorage.setItem('rol', response.rol);
        localStorage.setItem('id_usuario', response.id_usuario);
        if (response.zona_habitual) {
          localStorage.setItem('zona_habitual', response.zona_habitual);
        }
      })
    );
  }

  registro(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/registro`, datos);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('token');
  }

  getUsuarioActual() {
    return localStorage.getItem('usuario');
  }
}