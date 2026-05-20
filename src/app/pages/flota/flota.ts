import { Component, OnInit, OnDestroy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

interface Mantenimiento {
  id: string;
  id_embarcacion: string;
  nombre_embarcacion: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  costo: number;
  proxima_revision: string;
}

@Component({
  selector: 'app-flota',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'flota.html',
  styleUrl: 'flota.css'
})
export class FlotaComponent implements OnInit, OnDestroy {

  readonly ANIO_MIN = 1950;
  readonly ANIO_MAX = new Date().getFullYear();

  tabActiva: 'embarcaciones' | 'mantenimiento' = 'embarcaciones';

  embarcaciones: any[] = [];
  cargando      = true;
  mensaje       = '';
  errorMsg      = '';
  mostrarFormulario = false;

  nuevoBarco = {
    nombre:             '',
    capacidad_bodega:   15,
    velocidad_promedio: 10,
    consumo_hora:       20,
    autonomia_horas:    24,
    material_casco:     'FIBRA',
    tipo_motor:         'DIESEL',
    tripulacion_max:    6,
    anio_fabricacion:   2018
  };

  editandoBarco: any = null;
  barcoEditado: any  = {};

  historialModalBarco: any = null;
  historialBarco: any[]    = [];
  cargandoHistorial        = false;

  mantenimientos: Mantenimiento[] = [];
  mostrarFormMant = false;

  nuevoMant = {
    id_embarcacion:   '',
    fecha:            new Date().toISOString().split('T')[0],
    tipo:             'PREVENTIVO',
    descripcion:      '',
    costo:            0,
    proxima_revision: ''
  };

  tiposMantenimiento = ['PREVENTIVO', 'CORRECTIVO', 'MOTOR', 'CASCO', 'ELECTRONICA', 'COMBUSTIBLE', 'PINTURA'];

  private readonly destroyRef = inject(DestroyRef);

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarFlota();
    this.cargarMantenimientos();
  }

  ngOnDestroy() {}

  private mostrarMensaje(texto: string, esError = false) {
    if (esError) {
      this.errorMsg = texto;
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 4000);
    } else {
      this.mensaje = texto;
      setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
    }
    this.cdr.detectChanges();
  }

  // ========================
  // Embarcaciones
  // ========================

  cargarFlota() {
    this.cargando = true;
    this.cdr.detectChanges();
    this.api.getEmbarcaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.embarcaciones = data;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
  }

  private validarBarco(barco: typeof this.nuevoBarco): string | null {
    if (!barco.nombre.trim())                                          return 'El nombre es obligatorio';
    if (barco.capacidad_bodega   < 1)                                  return 'La capacidad debe ser al menos 1 TM';
    if (barco.velocidad_promedio < 1 || barco.velocidad_promedio > 50) return 'La velocidad debe estar entre 1 y 50 nudos';
    if (barco.consumo_hora       < 1)                                  return 'El consumo debe ser al menos 1 L/h';
    if (barco.autonomia_horas    < 1 || barco.autonomia_horas > 240)   return 'La autonomía debe estar entre 1 y 240 horas';
    if (barco.tripulacion_max    < 1 || barco.tripulacion_max > 100)   return 'La tripulación debe estar entre 1 y 100';
    if (barco.anio_fabricacion < this.ANIO_MIN || barco.anio_fabricacion > this.ANIO_MAX)
      return `El año debe estar entre ${this.ANIO_MIN} y ${this.ANIO_MAX}`;
    return null;
  }

  registrarBarco() {
    const error = this.validarBarco(this.nuevoBarco);
    if (error) { this.mostrarMensaje(error, true); return; }

    this.api.crearEmbarcacion(this.nuevoBarco)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.mostrarFormulario = false;
          this.nuevoBarco = { nombre: '', capacidad_bodega: 15, velocidad_promedio: 10, consumo_hora: 20, autonomia_horas: 24, material_casco: 'FIBRA', tipo_motor: 'DIESEL', tripulacion_max: 6, anio_fabricacion: 2018 };
          this.cargarFlota();
          this.mostrarMensaje(`¡${res.nombre} registrado correctamente!`);
        },
        error: () => this.mostrarMensaje('Error al registrar embarcación.', true)
      });
  }

  abrirEdicion(barco: any) {
    this.editandoBarco = barco;
    this.barcoEditado  = { ...barco };
  }

  guardarEdicion() {
    const error = this.validarBarco(this.barcoEditado);
    if (error) { this.mostrarMensaje(error, true); return; }

    this.api.actualizarEmbarcacion(this.editandoBarco.id_embarcacion, this.barcoEditado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editandoBarco = null;
          this.cargarFlota();
          this.mostrarMensaje(`${this.barcoEditado.nombre} actualizado correctamente`);
        },
        error: () => this.mostrarMensaje('Error al actualizar embarcación.', true)
      });
  }

  eliminarBarco(barco: any) {
    if (!confirm(`¿Eliminar "${barco.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarEmbarcacion(barco.id_embarcacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cargarFlota();
          this.mostrarMensaje(`${barco.nombre} eliminado`);
        },
        error: () => this.mostrarMensaje('Error al eliminar embarcación.', true)
      });
  }

  verHistorial(barco: any) {
    this.historialModalBarco = barco;
    this.historialBarco      = [];
    this.cargandoHistorial   = true;
    this.cdr.detectChanges();

    this.api.getHistorialEmbarcacion(barco.id_embarcacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.historialBarco    = data.rutas || [];
          this.cargandoHistorial = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargandoHistorial = false;
          this.cdr.detectChanges();
        }
      });
  }

  cambiarEstado(barco: any, event: Event) {
    const nuevoEstado    = (event.target as HTMLSelectElement).value;
    const estadoAnterior = barco.estado;
    barco.estado = nuevoEstado;
    this.api.cambiarEstadoEmbarcacion(barco.id_embarcacion, nuevoEstado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cdr.detectChanges(),
        error: () => {
          barco.estado = estadoAnterior;
          this.mostrarMensaje('Error al cambiar estado.', true);
          this.cdr.detectChanges();
        }
      });
  }

  optimizar(id: string, nombre: string) {
    this.mensaje = `Calculando ruta óptima para ${nombre}...`;
    this.cdr.detectChanges();
    this.api.calcularRutaOptima({ id_embarcacion: id, id_puerto: 'CHIMBOTE' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.mensaje = `Ruta generada: ${res.resultado?.distancia_total_km ?? '—'} km`;
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 5000);
        },
        error: () => {
          this.mostrarMensaje('Error al calcular ruta.', true);
        }
      });
  }

  // ========================
  // Mantenimiento
  // ========================

  cargarMantenimientos() {
    this.api.getMantenimientos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.mantenimientos = data;
          this.cdr.detectChanges();
        },
        error: () => this.cdr.detectChanges()
      });
  }

  agregarMantenimiento() {
    if (!this.nuevoMant.id_embarcacion) { this.mostrarMensaje('Selecciona una embarcación', true); return; }
    if (!this.nuevoMant.descripcion.trim()) { this.mostrarMensaje('La descripción es obligatoria', true); return; }

    const barco = this.embarcaciones.find(b => b.id_embarcacion === this.nuevoMant.id_embarcacion);
    const payload = {
      ...this.nuevoMant,
      nombre_embarcacion: barco?.nombre ?? this.nuevoMant.id_embarcacion,
    };

    this.api.crearMantenimiento(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.nuevoMant = { id_embarcacion: '', fecha: new Date().toISOString().split('T')[0], tipo: 'PREVENTIVO', descripcion: '', costo: 0, proxima_revision: '' };
          this.mostrarFormMant = false;
          this.cargarMantenimientos();
        },
        error: () => this.mostrarMensaje('Error al registrar mantenimiento.', true)
      });
  }

  eliminarMantenimiento(id: any) {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return;
    this.api.eliminarMantenimiento(Number(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cargarMantenimientos(),
        error: () => this.mostrarMensaje('Error al eliminar.', true)
      });
  }

  proximasRevisiones(): Mantenimiento[] {
    return this.mantenimientos
      .filter(m => m.proxima_revision)
      .sort((a, b) => new Date(a.proxima_revision).getTime() - new Date(b.proxima_revision).getTime())
      .slice(0, 5);
  }

  diasParaRevision(fecha: string): number {
    const diff = new Date(fecha).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  tipoColor(tipo: string): string {
    const colores: Record<string, string> = {
      'PREVENTIVO':  'bg-blue-100 text-blue-700',
      'CORRECTIVO':  'bg-red-100 text-red-700',
      'MOTOR':       'bg-orange-100 text-orange-700',
      'CASCO':       'bg-slate-100 text-slate-700',
      'ELECTRONICA': 'bg-purple-100 text-purple-700',
      'COMBUSTIBLE': 'bg-yellow-100 text-yellow-700',
      'PINTURA':     'bg-green-100 text-green-700'
    };
    return colores[tipo] ?? 'bg-slate-100 text-slate-700';
  }
}
