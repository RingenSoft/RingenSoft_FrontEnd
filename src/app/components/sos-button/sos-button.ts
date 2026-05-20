import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { ErrorGlobalService } from '../../services/error-global.service';

@Component({
  selector: 'app-sos-button',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Solo visible en páginas protegidas -->
    @if (visible()) {
      <!-- FAB SOS -->
      <button (click)="abrirModal()"
              class="fixed z-[990] animate-bounce-slow"
              style="bottom:1.5rem;right:1.5rem;
                     width:52px;height:52px;border-radius:50%;
                     background:var(--accent-red);border:2px solid rgba(255,255,255,0.25);
                     box-shadow:0 4px 20px rgba(138,24,24,0.55);
                     display:flex;align-items:center;justify-content:center;
                     cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;"
              title="Enviar alerta SOS"
              onmouseenter="this.style.transform='scale(1.1)';this.style.boxShadow='0 6px 28px rgba(138,24,24,0.7)'"
              onmouseleave="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(138,24,24,0.55)'">
        <svg class="w-5 h-5" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>

      <!-- Modal SOS -->
      @if (modalAbierto()) {
        <div class="modal-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-4"
             style="background:rgba(0,0,0,0.6);"
             (click)="cerrarModal()">
          <div class="modal-content w-full max-w-sm rounded-lg p-6"
               style="background:var(--bg-card);border:1px solid var(--border-mid);"
               (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-center gap-3 mb-4">
              <div class="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                   style="background:rgba(138,24,24,0.15);">
                <svg class="w-5 h-5" fill="none" stroke="var(--accent-red)" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h2 class="text-sm font-bold" style="color:var(--text-primary);">Alerta SOS</h2>
                <p class="text-xs" style="color:var(--text-secondary);">Se enviará tu ubicación a la Capitanía de Puerto</p>
              </div>
            </div>

            <!-- Estado GPS -->
            @if (gpsEstado() === 'buscando') {
              <div class="flex items-center gap-2 mb-4 px-3 py-2 rounded" style="background:rgba(138,96,32,0.12);border:1px solid rgba(138,96,32,0.3);">
                <div class="w-3 h-3 border-2 rounded-full animate-spin" style="border-color:var(--accent-amber);border-top-color:transparent;"></div>
                <span class="text-xs" style="color:var(--accent-amber);">Obteniendo ubicación GPS...</span>
              </div>
            }
            @if (gpsEstado() === 'ok') {
              <div class="flex items-center gap-2 mb-4 px-3 py-2 rounded" style="background:rgba(58,120,64,0.12);border:1px solid rgba(58,120,64,0.3);">
                <div class="w-2 h-2 rounded-full" style="background:var(--accent-green);"></div>
                <span class="text-xs font-mono" style="color:var(--accent-green);">{{ lat().toFixed(4) }}, {{ lon().toFixed(4) }}</span>
              </div>
            }
            @if (gpsEstado() === 'error') {
              <div class="flex items-center gap-2 mb-4 px-3 py-2 rounded" style="background:rgba(138,24,24,0.12);border:1px solid rgba(138,24,24,0.3);">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="var(--accent-red)" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span class="text-xs" style="color:var(--accent-red);">No se pudo obtener la ubicación</span>
              </div>
            }

            <!-- Mensaje adicional -->
            <div class="mb-4">
              <label class="text-xs font-medium block mb-1" style="color:var(--text-label);">Mensaje adicional (opcional)</label>
              <textarea [(ngModel)]="mensajeSOS" rows="2" maxlength="280"
                        class="w-full text-xs rounded px-3 py-2 resize-none"
                        style="background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border-mid);"
                        placeholder="Ej: Motor averiado, 3 tripulantes..."></textarea>
            </div>

            <!-- Acciones -->
            <div class="flex gap-2">
              <button (click)="cerrarModal()"
                      class="flex-1 text-xs font-medium py-2 rounded"
                      style="background:var(--bg-elevated);color:var(--text-secondary);border:1px solid var(--border-mid);">
                Cancelar
              </button>
              <button (click)="enviarSOS()"
                      [disabled]="enviando() || gpsEstado() !== 'ok'"
                      class="flex-1 text-xs font-bold py-2 rounded btn-primary"
                      style="background:var(--accent-red);color:#fff;border:none;cursor:pointer;"
                      [style.opacity]="(enviando() || gpsEstado() !== 'ok') ? '0.6' : '1'">
                @if (enviando()) {
                  Enviando...
                } @else {
                  Enviar SOS
                }
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Confirmación enviado -->
      @if (enviado()) {
        <div class="fixed z-[1001] inset-0 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.6);">
          <div class="modal-content text-center rounded-lg p-8 w-full max-w-xs"
               style="background:var(--bg-card);border:1px solid rgba(58,120,64,0.4);">
            <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                 style="background:rgba(58,120,64,0.15);">
              <svg class="w-7 h-7" fill="none" stroke="var(--accent-green)" stroke-width="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 class="text-sm font-bold mb-1" style="color:var(--text-primary);">SOS enviado</h3>
            <p class="text-xs mb-5" style="color:var(--text-secondary);">Se notificó a la Capitanía de Puerto con tu ubicación</p>
            <button (click)="enviado.set(false)" class="text-xs font-medium px-6 py-2 rounded"
                    style="background:var(--accent-green);color:#fff;border:none;cursor:pointer;">
              Cerrar
            </button>
          </div>
        </div>
      }
    }
  `
})
export class SosButtonComponent {
  private readonly api = inject(ApiService);
  private readonly errorSvc = inject(ErrorGlobalService);
  private readonly router = inject(Router);

  visible    = signal(false);
  modalAbierto = signal(false);
  gpsEstado  = signal<'idle' | 'buscando' | 'ok' | 'error'>('idle');
  lat        = signal(0);
  lon        = signal(0);
  enviando   = signal(false);
  enviado    = signal(false);
  mensajeSOS = '';

  private readonly RUTAS_OCULTAS = ['/login', '/registro'];

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.visible.set(!this.RUTAS_OCULTAS.some(r => e.urlAfterRedirects.startsWith(r)));
    });
  }

  abrirModal(): void {
    this.modalAbierto.set(true);
    this.gpsEstado.set('buscando');
    this.mensajeSOS = '';
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.lat.set(pos.coords.latitude);
        this.lon.set(pos.coords.longitude);
        this.gpsEstado.set('ok');
      },
      () => this.gpsEstado.set('error'),
      { timeout: 10000, maximumAge: 30000 }
    );
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.gpsEstado.set('idle');
  }

  enviarSOS(): void {
    if (this.gpsEstado() !== 'ok' || this.enviando()) return;
    this.enviando.set(true);
    this.api.enviarSOS({
      lat: this.lat(),
      lon: this.lon(),
      mensaje: this.mensajeSOS || undefined
    }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.modalAbierto.set(false);
        this.enviado.set(true);
        setTimeout(() => this.enviado.set(false), 8000);
      },
      error: () => {
        this.enviando.set(false);
        this.errorSvc.mostrar('No se pudo enviar el SOS. Intenta de nuevo.', 'error');
      }
    });
  }
}
