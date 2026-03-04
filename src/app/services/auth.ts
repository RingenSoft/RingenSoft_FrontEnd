import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/auth';

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('usuario', response.nombre_usuario);
        localStorage.setItem('rol', response.rol);
        if (response.id_embarcacion) {
          localStorage.setItem('mi_barco', response.id_embarcacion);
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
