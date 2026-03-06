import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector:    'app-flota',
  standalone:  true,
  imports:     [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'flota.html',
  styleUrl:    'flota.css'
})
export class FlotaComponent implements OnInit {

  embarcaciones: any[] = [];
  cargando        = true;
  mensaje         = '';
  mostrarFormulario = false;

  nuevoBarco = {
    nombre:             '',
    capacidad_bodega:   300,
    velocidad_promedio: 12,
    consumo:            1.5,
    material:           'ACERO NAVAL',
    tripulacion:        10,
    anio_fabricacion:   2020,
  };

  // Capacidad máxima de referencia para las barras (ajustar según tu flota)
  private readonly CAP_MAX_REF = 600;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() { this.cargarFlota(); }

  cargarFlota() {
    this.cargando = true;
    this.cdr.detectChanges();
    this.api.getEmbarcaciones().subscribe({
      next:  (data) => { this.embarcaciones = data; this.cargando = false; this.cdr.detectChanges(); },
      error: ()     => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  registrarBarco() {
    if (!this.nuevoBarco.nombre) return;
    this.api.crearEmbarcacion(this.nuevoBarco).subscribe({
      next: (res) => {
        this.mensaje = `${res.nombre} registrada correctamente.`;
        this.mostrarFormulario = false;
        this.cargarFlota();
        this.nuevoBarco = { nombre: '', capacidad_bodega: 300, velocidad_promedio: 12, consumo: 1.5, material: 'ACERO NAVAL', tripulacion: 10, anio_fabricacion: 2020 };
        this.cdr.detectChanges();
        setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3500);
      },
      error: () => {}
    });
  }

  cambiarEstado(barco: any, event: any) {
    const nuevoEstado   = event.target.value;
    const estadoAnterior = barco.estado;
    barco.estado = nuevoEstado;
    this.api.cambiarEstadoEmbarcacion(barco.id_embarcacion, nuevoEstado).subscribe({
      error: () => { barco.estado = estadoAnterior; this.cdr.detectChanges(); }
    });
  }

  optimizar(id: string, nombre: string) {
    this.router.navigate(['/mapa'], { queryParams: { barco: id } });
  }

  cerrarModalSiEsFondo(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.mostrarFormulario = false;
    }
  }

  // ── Helpers visuales para las cards ──────────────────────────────────────

  contarEstado(estado: string): number {
    return this.embarcaciones.filter(b => b.estado === estado).length;
  }

  getBorderColor(estado: string): string {
    const map: Record<string, string> = {
      'EN_RUTA':      'border-emerald-700/50 hover:border-emerald-600/70',
      'EN_ALTAMAR':   'border-sky-700/50 hover:border-sky-600/70',
      'MANTENIMIENTO':'border-red-800/40 hover:border-red-700/60',
      'EN_PUERTO':    'border-slate-700/50 hover:border-slate-600/60',
    };
    return map[estado] ?? 'border-slate-700/50';
  }

  getIconBg(estado: string): string {
    const map: Record<string, string> = {
      'EN_RUTA':      'bg-emerald-900/40 border border-emerald-700/40',
      'EN_ALTAMAR':   'bg-sky-900/40 border border-sky-700/40',
      'MANTENIMIENTO':'bg-red-900/30 border border-red-800/40',
      'EN_PUERTO':    'bg-slate-800 border border-slate-700',
    };
    return map[estado] ?? 'bg-slate-800';
  }

  getIconEmoji(estado: string): string {
    const map: Record<string, string> = {
      'EN_RUTA':      '🚢',
      'EN_ALTAMAR':   '🎣',
      'MANTENIMIENTO':'🔧',
      'EN_PUERTO':    '⚓',
    };
    return map[estado] ?? '🚢';
  }

  getBadgeClass(estado: string): string {
    const map: Record<string, string> = {
      'EN_RUTA':      'text-emerald-400 bg-emerald-900/30 border-emerald-700/40',
      'EN_ALTAMAR':   'text-sky-400 bg-sky-900/30 border-sky-700/40',
      'MANTENIMIENTO':'text-red-400 bg-red-900/20 border-red-800/40',
      'EN_PUERTO':    'text-slate-400 bg-slate-800 border-slate-700',
    };
    return map[estado] ?? 'text-slate-400 bg-slate-800 border-slate-700';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      'EN_RUTA':      'En ruta',
      'EN_ALTAMAR':   'Pescando',
      'MANTENIMIENTO':'Taller',
      'EN_PUERTO':    'En puerto',
    };
    return map[estado] ?? estado;
  }

  getBarWidth(cap: number): number {
    return Math.min(100, Math.round((cap / this.CAP_MAX_REF) * 100));
  }

  getBarColor(cap: number): string {
    if (cap >= 400) return 'bg-emerald-400';
    if (cap >= 200) return 'bg-sky-400';
    return 'bg-slate-500';
  }
}