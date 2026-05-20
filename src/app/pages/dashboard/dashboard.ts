import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  AfterViewInit, ElementRef, ViewChild, DestroyRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NotificacionesService } from '../../services/notificaciones.service';
import { AuthService } from '../../services/auth';
import { PUERTOS_COORDS } from '../../constants/app.constants';
import {
  Chart,
  DoughnutController, BarController,
  ArcElement, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend
} from 'chart.js';

Chart.register(
  DoughnutController, BarController,
  ArcElement, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('chartRutas')    chartRutasRef!: ElementRef;
  @ViewChild('chartEspecies') chartEspeciesRef!: ElementRef;

  condiciones:     any   = null;
  estadisticas:    any   = null;
  embarcaciones:   any[] = [];
  pronostico:      any   = null;
  pronosticoHoras: { hora: string; olas_m: number; viento_kmh: number }[] = [];
  cargando              = true;
  errorCarga            = false;
  saludo                = '';
  nombreUsuario         = '';
  fechaHoy              = '';
  ultimaActualizacion = '';
  private charts: Chart[] = [];

  // --- Flujo "Regresé del mar" ---
  mostrarModalRegreso  = false;
  pasoRegreso          = 1;
  rutasPendientes: any[] = [];
  rutaSeleccionada: any  = null;
  guardandoCaptura     = false;
  mlEntrenando         = false;
  mlResultado: any     = null;
  capturaForm = { captura_real_tm: 0 };

  // --- Panel IA ---
  estadoML: any = null;
  cargandoML  = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private notifs: NotificacionesService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const h = new Date().getHours();
    this.saludo        = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    this.nombreUsuario = (this.authService.getUsuarioActual() || '').split(' ')[0];
    this.fechaHoy      = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    this.notifs.solicitarPermiso();
    this.cargarDatos();
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }

  cargarDatos() {
    this.cargando = true;

    const zonaUsuario = this.authService.getZonaHabitual();
    const [lat, lon]  = PUERTOS_COORDS[zonaUsuario] ?? [-9.07, -78.59];

    this.api.getCondiciones(lat, lon, 'ANCHOVETA')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.condiciones        = data;
          this.cargando           = false;
          this.ultimaActualizacion = new Date().toLocaleTimeString('es-PE');
          this.cdr.detectChanges();
          setTimeout(() => this.iniciarGraficos(), 300);
          const nivel = data?.clima?.alerta?.nivel;
          const msg   = data?.clima?.alerta?.mensaje;
          if (nivel && msg) this.notifs.alertaClima(nivel, msg);
        },
        error: () => { this.cargando = false; this.errorCarga = true; this.cdr.detectChanges(); }
      });

    this.api.getPronostico48h(lat, lon)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.pronostico      = data;
          this.pronosticoHoras = (data?.horas || []).slice(0, 12);
          this.cdr.detectChanges();
        },
        error: () => {}
      });

    this.api.getEstadisticas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.estadisticas = data;
          this.cdr.detectChanges();
          setTimeout(() => this.iniciarGraficos(), 300);
        }
      });

    this.api.getEmbarcaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.embarcaciones = data; this.cdr.detectChanges(); }
      });

    this.api.getHistorialPendientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.rutasPendientes = data.rutas || []; this.cdr.detectChanges(); }
      });

    this.cargarEstadoML();
  }

  get fleetCounts(): { enPuerto: number; enMar: number; mantenimiento: number } {
    return {
      enPuerto:      this.embarcaciones.filter(b => b.estado === 'EN_PUERTO').length,
      enMar:         this.embarcaciones.filter(b => b.estado === 'EN_MAR').length,
      mantenimiento: this.embarcaciones.filter(b => b.estado === 'MANTENIMIENTO').length,
    };
  }

  iniciarGraficos() {
    if (!this.estadisticas) return;
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    this.crearGraficoEspecies();
    this.crearGraficoRutas();
  }

  crearGraficoEspecies() {
    if (!this.chartEspeciesRef || !this.estadisticas?.por_especie?.length) return;
    const datos = this.estadisticas.por_especie;
    this.charts.push(new Chart(this.chartEspeciesRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels:   datos.map((d: any) => d.especie),
        datasets: [{
          data:            datos.map((d: any) => d.rutas),
          backgroundColor: ['#1D9E75', '#378ADD', '#F59E0B', '#E24B4A'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
      }
    }));
  }

  crearGraficoRutas() {
    if (!this.chartRutasRef || !this.estadisticas?.ultimas_rutas?.length) return;
    const ultimas = this.estadisticas.ultimas_rutas.slice(0, 10).reverse();
    this.charts.push(new Chart(this.chartRutasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ultimas.map((_: any, i: number) => `R${i + 1}`),
        datasets: [
          {
            label:           'Distancia (km)',
            data:            ultimas.map((r: any) => r.distancia || 0),
            backgroundColor: '#378ADD',
            borderRadius:    6,
          },
          {
            label:           'Carga est. (TM×10)',
            data:            ultimas.map((r: any) => (r.carga || 0) * 10),
            backgroundColor: '#1D9E75',
            borderRadius:    6,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
        scales:  { y: { beginAtZero: true, grid: { color: '#1E3850' } } }
      }
    }));
  }

  getColorAlerta(nivel: string): string {
    if (nivel === 'ROJO')     return '#E24B4A';
    if (nivel === 'AMARILLO') return '#F59E0B';
    return '#1D9E75';
  }

  cargarEstadoML() {
    this.cargandoML = true;
    this.api.mlEstado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => { this.estadoML = data; this.cargandoML = false; this.cdr.detectChanges(); },
        error: ()         => { this.cargandoML = false; this.cdr.detectChanges(); }
      });
  }

  abrirModalRegreso() {
    this.pasoRegreso         = 1;
    this.rutaSeleccionada    = null;
    this.mlResultado         = null;
    this.capturaForm         = { captura_real_tm: 0 };
    this.mostrarModalRegreso = true;
    this.cdr.detectChanges();
  }

  seleccionarRuta(ruta: any) {
    this.rutaSeleccionada            = ruta;
    this.capturaForm.captura_real_tm = ruta.carga_estimada ?? 0;
    this.pasoRegreso                 = 2;
    this.cdr.detectChanges();
  }

  registrarCaptura() {
    if (!this.rutaSeleccionada || this.capturaForm.captura_real_tm <= 0) return;
    this.guardandoCaptura = true;
    this.cdr.detectChanges();

    this.api.reportarCapturaRuta(this.rutaSeleccionada.id, this.capturaForm.captura_real_tm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardandoCaptura = false;
          this.pasoRegreso      = 3;
          this.rutasPendientes  = this.rutasPendientes.filter(r => r.id !== this.rutaSeleccionada.id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.guardandoCaptura = false;
          this.cdr.detectChanges();
        }
      });
  }

  entrenarML() {
    this.mlEntrenando = true;
    this.cdr.detectChanges();
    this.api.mlEntrenar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.mlEntrenando = false;
          this.mlResultado  = res;
          this.cdr.detectChanges();
        },
        error: () => {
          this.mlEntrenando = false;
          this.cdr.detectChanges();
        }
      });
  }

  cerrarModalRegreso() {
    this.mostrarModalRegreso = false;
    if (this.pasoRegreso === 3) this.cargarDatos();
    this.cdr.detectChanges();
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
