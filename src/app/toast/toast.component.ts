import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border
                 max-w-sm w-full text-sm font-medium animate-[slideInUp_0.3s_ease-out]"
          [ngClass]="{
            'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
            'bg-red-50    border-red-200    text-red-800':     toast.type === 'error',
            'bg-amber-50  border-amber-200  text-amber-800':   toast.type === 'warning',
            'bg-blue-50   border-blue-200   text-blue-800':    toast.type === 'info'
          }">

          <!-- Ícono según tipo -->
          <i class="mt-0.5 text-base flex-shrink-0"
             [ngClass]="{
               'fas fa-check-circle text-emerald-500': toast.type === 'success',
               'fas fa-times-circle  text-red-500':    toast.type === 'error',
               'fas fa-exclamation-triangle text-amber-500': toast.type === 'warning',
               'fas fa-info-circle   text-blue-500':   toast.type === 'info'
             }">
          </i>

          <!-- Mensaje -->
          <span class="flex-1 leading-snug">{{ toast.message }}</span>

          <!-- Botón cerrar -->
          <button
            (click)="toastService.remove(toast.id)"
            class="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity text-xs flex-shrink-0">
            <i class="fas fa-times"></i>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}