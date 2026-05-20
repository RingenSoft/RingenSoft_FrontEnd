import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorGlobalService } from '../../services/error-global.service';

@Component({
  selector: 'app-error-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style="max-width:360px;">
      @for (e of svc.errores(); track e.id) {
        <div class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg animate-fade-in-up"
             [style]="estiloTipo(e.tipo)">
          <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            @if (e.tipo === 'error') {
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            } @else if (e.tipo === 'warning') {
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            } @else {
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            }
          </svg>
          <span class="text-xs leading-relaxed flex-1">{{ e.mensaje }}</span>
          <button (click)="svc.cerrar(e.id)" class="shrink-0 opacity-60 hover:opacity-100 transition-opacity" style="background:none;border:none;cursor:pointer;padding:0;">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ErrorToastComponent {
  readonly svc = inject(ErrorGlobalService);

  estiloTipo(tipo: string): string {
    const base = 'color:#F8FAFC;font-family:Inter,sans-serif;';
    if (tipo === 'error')   return base + 'background:#8A1818;border:1px solid rgba(255,255,255,0.12);';
    if (tipo === 'warning') return base + 'background:#8A6020;border:1px solid rgba(255,255,255,0.12);';
    return base + 'background:#2A5070;border:1px solid rgba(255,255,255,0.12);';
  }
}
