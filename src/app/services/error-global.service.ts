import { Injectable, signal } from '@angular/core';

export interface ErrorGlobal {
  mensaje: string;
  tipo: 'error' | 'warning' | 'info';
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ErrorGlobalService {

  private _counter = 0;
  readonly errores = signal<ErrorGlobal[]>([]);

  mostrar(mensaje: string, tipo: ErrorGlobal['tipo'] = 'error', duracionMs = 5000): void {
    const id = ++this._counter;
    this.errores.update(lista => [...lista, { mensaje, tipo, id }]);
    if (duracionMs > 0) {
      setTimeout(() => this.cerrar(id), duracionMs);
    }
  }

  cerrar(id: number): void {
    this.errores.update(lista => lista.filter(e => e.id !== id));
  }

  limpiar(): void {
    this.errores.set([]);
  }
}
