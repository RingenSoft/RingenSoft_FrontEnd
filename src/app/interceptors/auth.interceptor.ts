import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  // Adjuntar token a todas las peticiones que no sean de auth pública
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo redirigir a /login si el 401 viene de una ruta protegida,
      // NO del propio endpoint de login/registro (evita borrar el mensaje de error)
      const esEndpointAuth = req.url.includes('/auth/login') || req.url.includes('/auth/registro');
      if (error.status === 401 && !esEndpointAuth) {
        localStorage.clear();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
