import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NotificacionesService } from '../../services/notificaciones.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('chartRutas')    chartRutasRef!: ElementRef;
  @ViewChild('chartEspecies') chartEspeciesRef!: ElementRef;

  condiciones:    any    = null;
  estadisticas:   any    = null;
  embarcaciones:  any[]  = [];
  pronostico:     any    = null;
  cargando              = true;
  errorCarga            = false;
  saludo                = '';
  nombreUsuario         = '';
  fechaHoy              = '';
  private charts: any[] = [];

  // --- Flujo "Regresé del mar" ---
  mostrarModalRegreso  = false;
  pasoRegreso          = 1;          // 1=seleccionar ruta, 2=ingresar captura, 3=éxito
  rutasPendientes: any[] = [];
  rutaSeleccionada: any  = null;
  guardandoCaptura     = false;
  mlEntrenando         = false;
  mlResultado: any     = null;
  capturaForm = { captura_real_tm: 0 };

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private notifs: NotificacionesService,
  ) {}

  ngOnInit() {
    const h = new Date().getHours();
    this.saludo        = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    this.nombreUsuario = (localStorage.getItem('usuario') || '').split(' ')[0];
    this.fechaHoy      = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    this.notifs.solicitarPermiso();
    this.cargarDatos();
  }
  ngAfterViewInit() {}
  ngOnDestroy()    { this.charts.forEach(c => c.destroy()); }

  private readonly COORDS_PUERTOS: Record<string, [number, number]> = {
    CHIMBOTE: [-9.07, -78.59], PAITA: [-5.09, -81.11], ILO: [-17.64, -71.34],
    CALLAO: [-12.05, -77.15], PISCO: [-13.71, -76.22], MATARANI: [-17.0, -72.1],
    TALARA: [-4.57, -81.27], TUMBES: [-3.56, -80.45], HUACHO: [-11.11, -77.6],
    SUPE: [-10.79, -77.78], CHANCAY: [-11.56, -77.27], PUCUSANA: [-12.47, -76.8],
    TAMBO_DE_MORA: [-13.47, -76.19], ATICO: [-16.23, -73.65], QUILCA: [-16.72, -72.42],
    CAMANÃ: [-16.62, -72.71],
  };

  cargarDatos() {
    this.cargando = true;

    const zonaUsuario = localStorage.getItem('zona_habitual') || 'CHIMBOTE';
    const [lat, lon]  = this.COORDS_PUERTOS[zonaUsuario] ?? [-9.07, -78.59];

    // Condiciones meteoceanográficas usando la zona del usuario
    this.api.getCondiciones(lat, lon, 'ANCHOVETA').subscribe({
      next: (data: any) => {
        this.condiciones = data;
        this.cargando    = false;
        this.cdr.detectChanges();
        setTimeout(() => this.iniciarGraficos(), 300);
        // Notificación push si hay alerta
        const nivel = data?.clima?.alerta?.nivel;
        const msg   = data?.clima?.alerta?.mensaje;
        if (nivel && msg) this.notifs.alertaClima(nivel, msg);
      },
      error: () => { this.cargando = false; this.errorCarga = true; this.cdr.detectChanges(); }
    });

    // Pronóstico 48h
    this.api.getPronostico48h(lat, lon).subscribe({
      next: (data: any) => {
        this.pronostico = data;
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // KPIs y últimas rutas desde estadísticas
    this.api.getEstadisticas().subscribe({
      next: (data: any) => {
        this.estadisticas = data;
        this.cdr.detectChanges();
        setTimeout(() => this.iniciarGraficos(), 300);
      }
    });

    // Flota para el resumen de estado
    this.api.getEmbarcaciones().subscribe({
      next: (data: any) => { this.embarcaciones = data; this.cdr.detectChanges(); }
    });

    // Rutas pendientes de reporte
    this.api.getHistorialPendientes().subscribe({
      next: (data: any) => { this.rutasPendientes = data.rutas || []; this.cdr.detectChanges(); }
    });

    // Estado del modelo ML
    this.cargarEstadoML();
  }

  get fleetCounts(): { enPuerto: number; enMar: number; mantenimiento: number } {
    return {
      enPuerto:     this.embarcaciones.filter(b => b.estado === 'EN_PUERTO').length,
      enMar:        this.embarcaciones.filter(b => b.estado === 'EN_MAR').length,
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
        scales:  { y: { beginAtZero: true, grid: { color: '#f1f5f9' } } }
      }
    }));
  }

  getColorAlerta(nivel: string): string {
    if (nivel === 'ROJO')     return '#E24B4A';
    if (nivel === 'AMARILLO') return '#F59E0B';
    return '#1D9E75';
  }

  // --- Panel IA ---
  estadoML: any    = null;
  cargandoML       = false;

  cargarEstadoML() {
    this.cargandoML = true;
    this.api.mlEstado().subscribe({
      next: (data: any) => { this.estadoML = data; this.cargandoML = false; this.cdr.detectChanges(); },
      error: ()         => { this.cargandoML = false; this.cdr.detectChanges(); }
    });
  }

  // --- Modal "Regresé del mar" ---

  abrirModalRegreso() {
    this.pasoRegreso       = 1;
    this.rutaSeleccionada  = null;
    this.mlResultado       = null;
    this.capturaForm       = { captura_real_tm: 0 };
    this.mostrarModalRegreso = true;
    this.cdr.detectChanges();
  }

  seleccionarRuta(ruta: any) {
    this.rutaSeleccionada    = ruta;
    this.capturaForm.captura_real_tm = ruta.carga_estimada ?? 0;
    this.pasoRegreso         = 2;
    this.cdr.detectChanges();
  }

  registrarCaptura() {
    if (!this.rutaSeleccionada || this.capturaForm.captura_real_tm <= 0) return;
    this.guardandoCaptura = true;
    this.cdr.detectChanges();

    this.api.reportarCapturaRuta(
      this.rutaSeleccionada.id,
      this.capturaForm.captura_real_tm
    ).subscribe({
      next: () => {
        this.guardandoCaptura = false;
        this.pasoRegreso      = 3;
        // Quitar la ruta de pendientes
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
    this.api.mlEntrenar().subscribe({
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
