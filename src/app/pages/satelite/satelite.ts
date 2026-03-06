import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../toast/toast.service';

@Component({
  selector:    'app-satelite',
  standalone:  true,
  imports:     [CommonModule, FormsModule, SidebarComponent],
  templateUrl: 'satelite.html',
  styleUrl:    'satelite.css'
})
export class SateliteComponent implements OnInit {

  // ✅ FIX: exponer Math para usarlo en el template HTML
  Math = Math;

  // ── Parámetros de consulta ─────────────────────────────────────────────────
  tipoSeleccionado  = 'rgb';
  zonaSeleccionada  = 'peru';
  fechaInicio       = '';
  fechaFin          = '';

  tipos = [
    { id: 'rgb',  nombre: 'Color Real',     icono: '🛰️', desc: 'Imagen óptica — ver manchas superficiales visibles' },
    { id: 'ndci', nombre: 'Clorofila NDCI', icono: '🌿', desc: 'Índice de clorofila — zonas de alta productividad' },
    { id: 'fai',  nombre: 'Algas FAI',      icono: '🔬', desc: 'Materia flotante — cardúmenes superficiales' },
  ];

  zonas = [
    { id: 'norte',  nombre: 'Norte',          rango: 'Paita – Chimbote',    color: '#38bdf8' },
    { id: 'centro', nombre: 'Centro',         rango: 'Chimbote – Callao',   color: '#34d399' },
    { id: 'sur',    nombre: 'Sur',            rango: 'Callao – Ilo',        color: '#f59e0b' },
    { id: 'peru',   nombre: 'Perú completo',  rango: 'Todo el litoral',     color: '#a78bfa' },
  ];

  // ── Estado ─────────────────────────────────────────────────────────────────
  cargandoImagen  = false;
  cargandoManchas = false;
  snapshot:  any  = null;
  manchas:   any  = null;
  imagenZoom      = false;
  modoDemo        = false;

  constructor(
    private api:   ApiService,
    private toast: ToastService,
    private cdr:   ChangeDetectorRef
  ) {}

  ngOnInit() {
    const hoy    = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - 15);
    this.fechaFin    = hoy.toISOString().split('T')[0];
    this.fechaInicio = inicio.toISOString().split('T')[0];
    this.cargarManchas();
  }

  get tipoActual() {
    return this.tipos.find(t => t.id === this.tipoSeleccionado)!;
  }

  get zonaActual() {
    return this.zonas.find(z => z.id === this.zonaSeleccionada)!;
  }

  descargarImagen() {
    this.cargandoImagen = true;
    this.snapshot       = null;
    this.cdr.detectChanges();

    this.api.getSateliteSnapshot(
      this.fechaInicio,
      this.fechaFin,
      this.tipoSeleccionado,
      this.zonaSeleccionada
    ).subscribe({
      next: (res) => {
        this.snapshot       = res;
        this.modoDemo       = res.modo === 'demo_erddap';
        this.cargandoImagen = false;
        if (res.modo === 'error') {
          this.toast.warning('Sin imagen disponible. Configura las credenciales Sentinel Hub en .env');
        } else if (this.modoDemo) {
          this.toast.info('Mostrando imagen NOAA. Para Sentinel-2 real agrega las credenciales en .env');
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('No se pudo obtener la imagen satelital.');
        this.cargandoImagen = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarManchas() {
    this.cargandoManchas = true;
    this.cdr.detectChanges();

    this.api.getSateliteManchas().subscribe({
      next: (res) => {
        this.manchas        = res;
        this.cargandoManchas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoManchas = false;
        this.cdr.detectChanges();
      }
    });
  }

  get imagenSrc(): string {
    if (!this.snapshot?.imagen_base64) return '';
    return `data:image/png;base64,${this.snapshot.imagen_base64}`;
  }

  // ✅ Método en lugar de función inline — más limpio en templates Angular
  getIntensidadClass(intensidad: string): string {
    return ({
      'ALTA':  'text-red-400 bg-red-500/10 border-red-500/30',
      'MEDIA': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      'BAJA':  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    } as any)[intensidad] ?? '';
  }

  getBarColor(intensidad: string): string {
    return ({ 'ALTA': '#ef4444', 'MEDIA': '#f59e0b', 'BAJA': '#34d399' } as any)[intensidad] ?? '#64748b';
  }

  // ✅ Evita usar Math.min directamente en template
  barWidth(clorofila: number): number {
    return Math.min(100, clorofila * 10);
  }
}