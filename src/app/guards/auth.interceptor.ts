import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../toast/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast  = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 0:
          // Sin conexión al servidor
          toast.error('Sin conexión con el servidor. Verifica que el backend esté activo.');
          break;

        case 401:
          // Token expirado o inválido → limpiar sesión y redirigir
          toast.warning('Tu sesión expiró. Por favor vuelve a ingresar.');
          localStorage.clear();
          router.navigate(['/login']);
          break;

        case 403:
          toast.error('No tienes permisos para realizar esta acción.');
          break;

        case 404:
          // No mostrar toast en 404 — cada componente lo maneja
          break;

        case 422:
          toast.error('Datos inválidos. Revisa el formulario.');
          break;

        case 500:
        case 502:
        case 503:
          toast.error('Error interno del servidor. Intenta nuevamente en unos momentos.');
          break;

        default:
          if (error.status >= 400) {
            const msg = error.error?.detail || error.message || 'Error inesperado.';
            toast.error(msg);
          }
      }

      return throwError(() => error);
    })
  );
};