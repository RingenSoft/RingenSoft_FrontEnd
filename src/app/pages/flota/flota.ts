import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
export class FlotaComponent implements OnInit {

  readonly ANIO_MIN = 1950;
  readonly ANIO_MAX = new Date().getFullYear();

  // --- Tabs ---
  tabActiva: 'embarcaciones' | 'mantenimiento' = 'embarcaciones';

  // --- Embarcaciones ---
  embarcaciones: any[] = [];
  cargando      = true;
  mensaje       = '';
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

  // --- Editar embarcación ---
  editandoBarco: any = null;
  barcoEditado: any  = {};

  // --- Historial por embarcación ---
  historialModalBarco: any   = null;
  historialBarco: any[]      = [];
  cargandoHistorial          = false;

  // --- Mantenimiento ---
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

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarFlota();
    this.cargarMantenimientos();
  }

  // ========================
  // Embarcaciones
  // ========================

  cargarFlota() {
    this.cargando = true;
    this.cdr.detectChanges();
    this.api.getEmbarcaciones().subscribe({
      next: (data: any) => {
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
    if (error) { alert(error); return; }

    this.api.crearEmbarcacion(this.nuevoBarco).subscribe({
      next: (res) => {
        this.mensaje = `¡${res.nombre} registrado correctamente!`;
        this.mostrarFormulario = false;
        this.cargarFlota();
        this.nuevoBarco = { nombre: '', capacidad_bodega: 15, velocidad_promedio: 10, consumo_hora: 20, autonomia_horas: 24, material_casco: 'FIBRA', tipo_motor: 'DIESEL', tripulacion_max: 6, anio_fabricacion: 2018 };
        this.cdr.detectChanges();
        setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: () => alert('Error al registrar embarcación.')
    });
  }

  abrirEdicion(barco: any) {
    this.editandoBarco = barco;
    this.barcoEditado  = { ...barco };
  }

  guardarEdicion() {
    const error = this.validarBarco(this.barcoEditado);
    if (error) { alert(error); return; }

    this.api.actualizarEmbarcacion(this.editandoBarco.id_embarcacion, this.barcoEditado).subscribe({
      next: () => {
        this.mensaje = `${this.barcoEditado.nombre} actualizado correctamente`;
        this.editandoBarco = null;
        this.cargarFlota();
        this.cdr.detectChanges();
        setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: () => alert('Error al actualizar embarcación.')
    });
  }

  eliminarBarco(barco: any) {
    if (!confirm(`¿Eliminar "${barco.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarEmbarcacion(barco.id_embarcacion).subscribe({
      next: () => {
        this.mensaje = `${barco.nombre} eliminado`;
        this.cargarFlota();
        this.cdr.detectChanges();
        setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: () => alert('Error al eliminar embarcación.')
    });
  }

  verHistorial(barco: any) {
    this.historialModalBarco = barco;
    this.historialBarco      = [];
    this.cargandoHistorial   = true;
    this.cdr.detectChanges();

    this.api.getHistorialEmbarcacion(barco.id_embarcacion).subscribe({
      next: (data: any) => {
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

  cambiarEstado(barco: any, event: any) {
    const nuevoEstado    = event.target.value;
    const estadoAnterior = barco.estado;
    barco.estado = nuevoEstado;
    this.api.cambiarEstadoEmbarcacion(barco.id_embarcacion, nuevoEstado).subscribe({
      next: () => this.cdr.detectChanges(),
      error: () => {
        barco.estado = estadoAnterior;
        alert('Error al cambiar estado.');
        this.cdr.detectChanges();
      }
    });
  }

  optimizar(id: string, nombre: string) {
    this.mensaje = `Calculando ruta óptima para ${nombre}...`;
    this.cdr.detectChanges();
    this.api.optimizarRuta({ id_embarcacion: id, id_puerto: 'CHIMBOTE' }).subscribe({
      next: (res) => {
        this.mensaje = `✅ Ruta generada: ${res.distancia_total_km} km`;
        this.cdr.detectChanges();
        setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 5000);
      },
      error: () => {
        this.mensaje = '❌ Error de conexión.';
        this.cdr.detectChanges();
      }
    });
  }

  // ========================
  // Mantenimiento
  // ========================

  cargarMantenimientos() {
    this.api.getMantenimientos().subscribe({
      next: (data: any[]) => {
        this.mantenimientos = data;
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  agregarMantenimiento() {
    if (!this.nuevoMant.id_embarcacion) { alert('Selecciona una embarcación'); return; }
    if (!this.nuevoMant.descripcion.trim()) { alert('La descripción es obligatoria'); return; }

    const barco = this.embarcaciones.find(b => b.id_embarcacion === this.nuevoMant.id_embarcacion);
    const payload = {
      ...this.nuevoMant,
      nombre_embarcacion: barco?.nombre ?? this.nuevoMant.id_embarcacion,
    };

    this.api.crearMantenimiento(payload).subscribe({
      next: () => {
        this.nuevoMant = { id_embarcacion: '', fecha: new Date().toISOString().split('T')[0], tipo: 'PREVENTIVO', descripcion: '', costo: 0, proxima_revision: '' };
        this.mostrarFormMant = false;
        this.cargarMantenimientos();
      },
      error: () => alert('Error al registrar mantenimiento.')
    });
  }

  eliminarMantenimiento(id: any) {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return;
    this.api.eliminarMantenimiento(Number(id)).subscribe({
      next: () => this.cargarMantenimientos(),
      error: () => alert('Error al eliminar.')
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
