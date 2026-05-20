import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ESPECIES } from '../../constants/app.constants';

const ZONAS = [
  'NORTE', 'CENTRO', 'SUR', 'NORTE-CENTRO', 'CENTRO-SUR'
];
const TIPOS_PESCADOR = [
  'ARTESANAL', 'SEMI-INDUSTRIAL', 'INDUSTRIAL', 'DEPORTIVO'
];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.65);">
        <div class="modal-content w-full max-w-md rounded-xl overflow-hidden"
             style="background:var(--bg-card);border:1px solid var(--border-mid);">

          <!-- Cabecera con progreso -->
          <div class="px-6 pt-6 pb-4">
            <div class="flex items-center gap-2 mb-1">
              <svg class="w-4 h-4" fill="none" stroke="var(--accent-cyan)" stroke-width="2" viewBox="0 0 24 24">
                <path d="M3 18 L12 4 L21 18"/><path d="M7 18 L12 10 L17 18"/>
              </svg>
              <span class="text-xs font-bold tracking-wide" style="color:var(--accent-cyan);">FishRoute Pro</span>
            </div>
            <h2 class="text-base font-black mb-1" style="color:var(--text-primary);">Configura tu perfil</h2>
            <p class="text-xs mb-4" style="color:var(--text-secondary);">Paso {{ paso() }} de 3 — personalizamos las recomendaciones</p>
            <!-- Barra de progreso -->
            <div class="flex gap-1.5">
              @for (p of [1,2,3]; track p) {
                <div class="h-1 flex-1 rounded-full transition-all"
                     [style.background]="p <= paso() ? 'var(--accent-cyan)' : 'var(--bg-elevated)'"></div>
              }
            </div>
          </div>

          <!-- Paso 1: Zona habitual -->
          @if (paso() === 1) {
            <div class="px-6 pb-6 animate-fade-in-up">
              <p class="text-sm font-semibold mb-3" style="color:var(--text-primary);">¿En qué zona del Perú pescas habitualmente?</p>
              <div class="grid grid-cols-2 gap-2">
                @for (z of zonas; track z) {
                  <button (click)="form.zona_habitual = z"
                          class="py-3 rounded text-xs font-bold transition-all"
                          [style]="form.zona_habitual === z
                            ? 'background:rgba(122,32,32,0.15);border:1.5px solid var(--accent-cyan);color:var(--accent-cyan);'
                            : 'background:var(--bg-elevated);border:1px solid var(--border-mid);color:var(--text-secondary);'">
                    {{ z }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Paso 2: Tipo de pescador -->
          @if (paso() === 2) {
            <div class="px-6 pb-6 animate-fade-in-up">
              <p class="text-sm font-semibold mb-3" style="color:var(--text-primary);">¿Cómo clasificarías tu pesca?</p>
              <div class="space-y-2">
                @for (t of tiposPescador; track t) {
                  <button (click)="form.tipo_pescador = t"
                          class="w-full py-3 px-4 rounded text-xs font-bold text-left transition-all"
                          [style]="form.tipo_pescador === t
                            ? 'background:rgba(122,32,32,0.15);border:1.5px solid var(--accent-cyan);color:var(--accent-cyan);'
                            : 'background:var(--bg-elevated);border:1px solid var(--border-mid);color:var(--text-secondary);'">
                    {{ t }}
                  </button>
                }
              </div>
              <div class="mt-3">
                <label class="text-[10px] font-bold uppercase tracking-wider block mb-1" style="color:var(--text-label);">Años de experiencia</label>
                <input type="number" [(ngModel)]="form.anos_experiencia" min="0" max="60"
                       class="w-full text-xs px-3 py-2 rounded" placeholder="Ej: 15"/>
              </div>
            </div>
          }

          <!-- Paso 3: Notificaciones -->
          @if (paso() === 3) {
            <div class="px-6 pb-6 animate-fade-in-up">
              <div class="text-center py-4">
                <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                     style="background:rgba(42,80,112,0.12);">
                  <svg class="w-7 h-7" fill="none" stroke="var(--accent-blue)" stroke-width="1.75" viewBox="0 0 24 24">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <p class="text-sm font-bold mb-2" style="color:var(--text-primary);">Alertas de condiciones</p>
                <p class="text-xs mb-4" style="color:var(--text-secondary);">Recibe notificaciones cuando el mar cambie en tu zona habitual</p>
                @if (notifEstado() === 'idle') {
                  <button (click)="pedirNotificaciones()"
                          class="px-6 py-2.5 rounded text-xs font-bold btn-primary"
                          style="background:var(--accent-blue);color:#fff;border:none;cursor:pointer;">
                    Activar notificaciones
                  </button>
                }
                @if (notifEstado() === 'granted') {
                  <div class="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-medium"
                       style="background:rgba(58,120,64,0.12);color:var(--accent-green);border:1px solid rgba(58,120,64,0.3);">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Notificaciones activadas
                  </div>
                }
                @if (notifEstado() === 'denied') {
                  <p class="text-xs" style="color:var(--text-label);">Puedes activarlas más tarde en la configuración del navegador</p>
                }
              </div>
            </div>
          }

          <!-- Pie con botones -->
          <div class="px-6 pb-6 flex gap-2">
            @if (paso() > 1) {
              <button (click)="paso.set(paso() - 1)"
                      class="px-4 py-2 rounded text-xs font-medium"
                      style="background:var(--bg-elevated);color:var(--text-secondary);border:1px solid var(--border-mid);">
                Atrás
              </button>
            }
            <div class="flex-1"></div>
            <button (click)="omitir()"
                    class="px-4 py-2 rounded text-xs font-medium"
                    style="color:var(--text-label);background:none;border:none;cursor:pointer;">
              Omitir
            </button>
            @if (paso() < 3) {
              <button (click)="siguiente()"
                      [disabled]="!puedeAvanzar()"
                      class="px-5 py-2 rounded text-xs font-bold btn-primary"
                      style="background:var(--accent-cyan);color:#fff;border:none;cursor:pointer;"
                      [style.opacity]="puedeAvanzar() ? '1' : '0.45'">
                Siguiente →
              </button>
            } @else {
              <button (click)="finalizar()" [disabled]="guardando()"
                      class="px-5 py-2 rounded text-xs font-bold btn-primary"
                      style="background:var(--accent-green);color:#fff;border:none;cursor:pointer;"
                      [style.opacity]="guardando() ? '0.6' : '1'">
                {{ guardando() ? 'Guardando...' : 'Comenzar' }}
              </button>
            }
          </div>

        </div>
      </div>
    }
  `
})
export class OnboardingComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly zonas         = ZONAS;
  readonly tiposPescador = TIPOS_PESCADOR;
  readonly especies      = ESPECIES;

  visible    = signal(false);
  paso       = signal(1);
  guardando  = signal(false);
  notifEstado = signal<'idle' | 'granted' | 'denied'>('idle');

  form = {
    zona_habitual:   '',
    tipo_pescador:   '',
    anos_experiencia: 0
  };

  ngOnInit(): void {
    // Verificar si el usuario ya completó el onboarding
    const yaCompleto = localStorage.getItem('onboarding_completo') === 'true';
    if (!yaCompleto) {
      setTimeout(() => {
        this.api.getOnboardingEstado().subscribe({
          next: estado => {
            if (!estado.onboarding_completo) {
              this.visible.set(true);
            }
          },
          error: () => {} // si falla el check, no interrumpir
        });
      }, 1500); // pequeño delay para no aparecer inmediatamente
    }
  }

  puedeAvanzar(): boolean {
    if (this.paso() === 1) return !!this.form.zona_habitual;
    if (this.paso() === 2) return !!this.form.tipo_pescador;
    return true;
  }

  siguiente(): void {
    if (!this.puedeAvanzar()) return;
    this.paso.update(p => Math.min(p + 1, 3));
  }

  async pedirNotificaciones(): Promise<void> {
    if (!('Notification' in window)) {
      this.notifEstado.set('denied');
      return;
    }
    const perm = await Notification.requestPermission();
    this.notifEstado.set(perm === 'granted' ? 'granted' : 'denied');
  }

  finalizar(): void {
    this.guardando.set(true);
    this.api.completarOnboarding({
      zona_habitual:   this.form.zona_habitual,
      tipo_pescador:   this.form.tipo_pescador   || undefined,
      anos_experiencia:this.form.anos_experiencia || undefined
    }).subscribe({
      next: () => {
        localStorage.setItem('onboarding_completo', 'true');
        this.guardando.set(false);
        this.visible.set(false);
      },
      error: () => {
        // Incluso si falla el API, cerrar para no bloquear al usuario
        localStorage.setItem('onboarding_completo', 'true');
        this.guardando.set(false);
        this.visible.set(false);
      }
    });
  }

  omitir(): void {
    localStorage.setItem('onboarding_completo', 'true');
    this.visible.set(false);
  }
}
