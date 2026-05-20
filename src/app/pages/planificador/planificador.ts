import { Component, OnInit, OnDestroy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ESPECIES } from '../../constants/app.constants';

@Component({
  selector: 'app-planificador',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './planificador.html',
})
export class PlanificadorComponent implements OnInit, OnDestroy {

  puertos:       any[] = [];
  embarcaciones: any[] = [];
  planes:        any[] = [];
  cargando       = false;
  mostrarForm    = false;
  guardando      = false;
  errorMsg       = '';

  // --- Comparador de rutas ---
  comparando       = false;
  rutasComparadas: any[] | null = null;
  errorComparador  = '';
  rutaElegida: any = null;

  form = {
    nombre_viaje:    '',
    puerto_id:       'CHIMBOTE',
    especie:         'ANCHOVETA',
    fecha_salida:    '',
    hora_salida:     '06:00',
    id_embarcacion:  '',
    combustible_pct: 0.9,
    notas:           '',
  };

  condicionesFecha: any = null;
  cargandoCondiciones   = false;
  readonly especies     = ESPECIES;

  // --- Mareas y vedas ---
  mareas: any = null;
  veda:   any = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    this.form.fecha_salida = manana.toISOString().split('T')[0];
    // Verificar veda para la fecha inicial
    setTimeout(() => this.cargarVeda(), 500);

    this.api.getPuertos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        this.puertos = d.puertos;
        this.cdr.detectChanges();
        this.verificarCondiciones();
      }
    });

    this.api.getEmbarcaciones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        this.embarcaciones = d;
        if (d.length > 0) this.form.id_embarcacion = d[0].id_embarcacion;
        this.cdr.detectChanges();
      }
    });

    this.cargarPlanes();
  }

  ngOnDestroy() {}

  cargarPlanes() {
    this.cargando = true;
    this.api.getPlanes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.planes   = data.map(p => ({
          ...p,
          condiciones: p.condiciones_json ? this.tryParseJSON(p.condiciones_json) : null,
        }));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  private tryParseJSON(s: string): any {
    try { return JSON.parse(s); } catch { return null; }
  }

  verificarCondiciones() {
    const puerto = this.puertos.find((p: any) => p.id === this.form.puerto_id);
    if (!puerto) return;
    this.cargandoCondiciones = true;
    this.api.getCondiciones(puerto.lat, puerto.lon, this.form.especie)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d: any) => {
          this.condicionesFecha    = d;
          this.cargandoCondiciones = false;
          this.cdr.detectChanges();
        },
        error: () => { this.cargandoCondiciones = false; this.cdr.detectChanges(); }
      });

    // Cargar mareas del puerto seleccionado
    this.api.getMareas(puerto.lat, puerto.lon)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d: any) => { this.mareas = d; this.cdr.detectChanges(); }, error: () => {} });

    // Verificar veda para la especie y fecha seleccionadas
    this.cargarVeda();
  }

  cargarVeda() {
    this.api.getVedas(this.form.especie, this.form.fecha_salida)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d: any) => { this.veda = d?.verificacion ?? null; this.cdr.detectChanges(); }, error: () => {} });
  }

  // ---- Comparador de rutas ----
  compararRutas() {
    this.comparando      = true;
    this.rutasComparadas = null;
    this.errorComparador = '';
    this.rutaElegida     = null;

    const emb = this.embarcaciones.find((e: any) => e.id_embarcacion === this.form.id_embarcacion);

    const payload = {
      id_puerto:        this.form.puerto_id,
      especie:          this.form.especie,
      combustible_pct:  this.form.combustible_pct,
      velocidad_nudos:  emb?.velocidad_promedio  ?? null,
      autonomia_horas:  emb?.autonomia_horas     ?? null,
      consumo_hora:     emb?.consumo_hora        ?? null,
      capacidad_bodega: emb?.capacidad_bodega    ?? null,
      anio_fabricacion: emb?.anio_fabricacion    ?? null,
      top_zonas:        5,
      id_embarcacion:   this.form.id_embarcacion || null,
    };

    this.api.calcularRutasComparadas(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.comparando = false;
          if (data.status === 'BLOQUEADO') {
            this.errorComparador = `No se puede navegar — ${data.alerta?.mensaje ?? 'Condiciones peligrosas'}`;
          } else {
            this.rutasComparadas = data.rutas ?? [];
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.comparando      = false;
          this.errorComparador = 'Error al calcular rutas. Intenta de nuevo en unos momentos.';
          this.cdr.detectChanges();
        }
      });
  }

  elegirRuta(ruta: any) {
    this.rutaElegida = ruta;
    if (!this.form.nombre_viaje) {
      this.form.nombre_viaje = `Viaje ${this.getModoLabel(ruta.modo)} — ${this.form.especie}`;
    }
    this.rutasComparadas = null;
    this.guardarPlan();
  }

  getModoLabel(modo: string): string {
    if (modo === 'max_captura')     return 'Máxima Captura';
    if (modo === 'min_combustible') return 'Mínimo Combustible';
    return 'Equilibrada';
  }


  getMejorRuta(): any {
    if (!this.rutasComparadas?.length) return null;
    return this.rutasComparadas.reduce((a, b) =>
      (a.fish_score_promedio ?? 0) >= (b.fish_score_promedio ?? 0) ? a : b
    );
  }

  guardarPlan() {
    if (!this.form.nombre_viaje || !this.form.fecha_salida) {
      this.errorMsg = 'Completa nombre y fecha del viaje';
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
      this.cdr.detectChanges();
      return;
    }
    this.guardando = true;
    const payload = {
      ...this.form,
      condiciones_json: this.condicionesFecha ? JSON.stringify(this.condicionesFecha) : null,
    };
    this.api.crearPlan(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (nuevo: any) => {
        this.planes.unshift({
          ...nuevo,
          condiciones: this.condicionesFecha,
        });
        this.mostrarForm = false;
        this.guardando   = false;
        this.rutaElegida = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg  = 'Error al guardar el plan.';
        setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
        this.cdr.detectChanges();
      }
    });
  }

  eliminarPlan(id: number) {
    if (!confirm('¿Eliminar este plan de viaje?')) return;
    this.api.eliminarPlan(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.planes = this.planes.filter((p: any) => p.id !== id);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstadoPlan(plan: any, estado: string) {
    this.api.actualizarEstadoPlan(plan.id, estado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          plan.estado = estado;
          this.cdr.detectChanges();
        }
      });
  }

}
