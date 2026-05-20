import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorGlobalService } from '../services/error-global.service';

const MENSAJES: Record<number, string> = {
  0:   'Sin conexión con el servidor',
  400: 'Solicitud inválida',
  403: 'No tienes permiso para esta acción',
  404: 'Recurso no encontrado',
  429: 'Demasiadas solicitudes, intenta en un momento',
  500: 'Error interno del servidor',
  503: 'Servicio temporalmente no disponible',
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorSvc = inject(ErrorGlobalService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // No mostrar banner para auth (los componentes muestran su propio error)
      const esAuth = req.url.includes('/auth/login') || req.url.includes('/auth/registro');
      if (!esAuth) {
        const detalle = err.error?.detail ?? err.error?.message ?? null;
        const base = MENSAJES[err.status] ?? `Error ${err.status}`;
        const mensaje = detalle ? `${base}: ${detalle}` : base;
        errorSvc.mostrar(mensaje, 'error');
      }
      return throwError(() => err);
    })
  );
};
