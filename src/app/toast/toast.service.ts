import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  private add(message: string, type: ToastType, duration = 4000) {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string) { this.add(message, 'success'); }
  error(message: string)   { this.add(message, 'error', 5000); }
  warning(message: string) { this.add(message, 'warning'); }
  info(message: string)    { this.add(message, 'info'); }

  remove(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}