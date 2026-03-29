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

  // --- Tabs ---
  tabActiva: 'embarcaciones' | 'mantenimiento' = 'embarcaciones';

  // --- Embarcaciones ---
  embarcaciones: any[] = [];
  cargando: boolean = true;
  mensaje: string = '';
  mostrarFormulario: boolean = false;

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
      error: (err: any) => {
        console.error('Error cargando flota', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  registrarBarco() {
    if (!this.nuevoBarco.nombre) {
      alert('El nombre es obligatorio');
      return;
    }
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

  cambiarEstado(barco: any, event: any) {
    const nuevoEstado  = event.target.value;
    const estadoAnterior = barco.estado;
    barco.estado = nuevoEstado;
    this.api.cambiarEstadoEmbarcacion(barco.id_embarcacion, nuevoEstado).subscribe({
      next: () => this.cdr.detectChanges(),
      error: (err) => {
        console.error(err);
        barco.estado = estadoAnterior;
        alert('Error al cambiar estado.');
        this.cdr.detectChanges();
      }
    });
  }

  optimizar(id: string, nombre: string) {
    this.mensaje = `Calculando ruta óptima para ${nombre}...`;
    this.cdr.detectChanges();
    this.api.optimizarRuta({ id_embarcacion: id, puerto_salida_id: 'CHIMBOTE' }).subscribe({
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
    const data = localStorage.getItem('fishroute_mantenimientos');
    this.mantenimientos = data ? JSON.parse(data) : [];
  }

  private guardarMantenimientos() {
    localStorage.setItem('fishroute_mantenimientos', JSON.stringify(this.mantenimientos));
  }

  agregarMantenimiento() {
    if (!this.nuevoMant.id_embarcacion) {
      alert('Selecciona una embarcación');
      return;
    }
    if (!this.nuevoMant.descripcion.trim()) {
      alert('La descripción es obligatoria');
      return;
    }

    const barco = this.embarcaciones.find(b => b.id_embarcacion === this.nuevoMant.id_embarcacion);
    const registro: Mantenimiento = {
      id:                   Date.now().toString(),
      id_embarcacion:       this.nuevoMant.id_embarcacion,
      nombre_embarcacion:   barco?.nombre ?? this.nuevoMant.id_embarcacion,
      fecha:                this.nuevoMant.fecha,
      tipo:                 this.nuevoMant.tipo,
      descripcion:          this.nuevoMant.descripcion.trim(),
      costo:                this.nuevoMant.costo,
      proxima_revision:     this.nuevoMant.proxima_revision
    };

    this.mantenimientos.unshift(registro);
    this.guardarMantenimientos();
    this.nuevoMant = { id_embarcacion: '', fecha: new Date().toISOString().split('T')[0], tipo: 'PREVENTIVO', descripcion: '', costo: 0, proxima_revision: '' };
    this.mostrarFormMant = false;
    this.cdr.detectChanges();
  }

  proximasRevisiones(): Mantenimiento[] {
    const hoy = new Date();
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
