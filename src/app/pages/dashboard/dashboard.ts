import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ChangeDetectorRef, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [CommonModule, SidebarComponent, RouterLink],
  templateUrl: 'dashboard.html',
  styleUrl:    'dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartBiomasa')  chartBiomasaRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartFlota')    chartFlotaRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('chartClorofila')chartClorofilaRef!: ElementRef<HTMLCanvasElement>;

  reporte:  any    = null;
  manchas:  any    = null;
  bancos:   any[]  = [];
  cargando  = true;
  errorCarga = false;

  private charts: Chart[] = [];

  // KPIs calculados desde bancos
  kpiOceanico = {
    clorofila_prom: 0,
    temp_prom:      0,
    olas_prom:      0,
    bancos_favorables: 0,
    bancos_precaucion: 0,
    bancos_peligroso:  0,
  };

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.cargarTodo(); }

  ngAfterViewInit() {}

  ngOnDestroy() { this.charts.forEach(c => c.destroy()); }

  cargarTodo() {
    this.cargando   = true;
    this.errorCarga = false;
    this.cdr.detectChanges();

    // Cargar reporte principal
    this.api.getReportesAvanzados().subscribe({
      next: (data) => {
        this.reporte = data;
        this.cargando = false;
        this.cdr.detectChanges();
        setTimeout(() => this._renderCharts(), 100);
      },
      error: () => {
        this.errorCarga = true;
        this.cargando   = false;
        this.cdr.detectChanges();
      }
    });

    // Cargar bancos para KPIs oceanográficos — independiente del reporte
    this.api.getBancos().subscribe({
      next: (data) => {
        this.bancos = data;
        this._calcularKpisOceanicos(data);
        this.cdr.detectChanges();
        setTimeout(() => this._renderChartClorofila(), 200);
      },
      error: () => {}
    });

    // Cargar manchas satelitales
    this.api.getSateliteManchas().subscribe({
      next:  (m) => { this.manchas = m; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  private _calcularKpisOceanicos(bancos: any[]) {
    const conDatos = bancos.filter(b => b.temperatura != null);
    if (!conDatos.length) return;

    this.kpiOceanico.temp_prom      = +(conDatos.reduce((s, b) => s + (b.temperatura || 0), 0) / conDatos.length).toFixed(1);
    this.kpiOceanico.clorofila_prom = +(conDatos.filter(b => b.clorofila).reduce((s, b) => s + (b.clorofila || 0), 0) / (conDatos.filter(b => b.clorofila).length || 1)).toFixed(2);
    this.kpiOceanico.olas_prom      = +(conDatos.filter(b => b.olas_m).reduce((s, b) => s + (b.olas_m || 0), 0) / (conDatos.filter(b => b.olas_m).length || 1)).toFixed(1);
    this.kpiOceanico.bancos_favorables = bancos.filter(b => b.condicion_mar === 'FAVORABLE' && b.toneladas > 0).length;
    this.kpiOceanico.bancos_precaucion = bancos.filter(b => b.condicion_mar === 'PRECAUCION').length;
    this.kpiOceanico.bancos_peligroso  = bancos.filter(b => b.condicion_mar === 'PELIGROSO').length;
  }

  private _renderCharts() {
    this._renderChartBiomasa();
    this._renderChartFlota();
  }

  private _renderChartBiomasa() {
    const el = this.chartBiomasaRef?.nativeElement;
    if (!el || !this.reporte?.tendencia_semanal?.length) return;
    const existing = this.charts.find(c => (c.canvas as any) === el);
    if (existing) { existing.destroy(); this.charts = this.charts.filter(c => c !== existing); }

    const labels = this.reporte.tendencia_semanal.map((d: any) => d.label);
    const vals   = this.reporte.tendencia_semanal.map((d: any) => d.value);
    const max    = Math.max(...vals);

    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'TM proyectadas',
          data:  vals,
          backgroundColor: vals.map((v: number) =>
            v === max ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.25)'
          ),
          borderColor: vals.map((v: number) =>
            v === max ? '#38bdf8' : 'rgba(56,189,248,0.4)'
          ),
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: '#0f172a', titleColor: '#94a3b8',
          bodyColor: '#38bdf8', borderColor: '#1e3a5f', borderWidth: 1,
          callbacks: { label: (ctx) => ` ${(ctx.parsed.y ?? 0).toFixed(0)} TM` }
        }},
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11, weight: 'bold' } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } },
               beginAtZero: true }
        }
      }
    });
    this.charts.push(chart);
  }

  private _renderChartFlota() {
    const el = this.chartFlotaRef?.nativeElement;
    if (!el || !this.reporte) return;
    const existing = this.charts.find(c => (c.canvas as any) === el);
    if (existing) { existing.destroy(); this.charts = this.charts.filter(c => c !== existing); }

    // Datos de estado de flota
    const estados = this.reporte.estado_flota || [];
    const labels  = estados.map((e: any) => e.label);
    const vals    = estados.map((e: any) => e.value);
    const colors  = estados.map((e: any) => e.color || '#64748b');

    if (!vals.length || vals.every((v: number) => v === 0)) return;

    const chart = new Chart(el, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 10 } },
          tooltip: {
            backgroundColor: '#0f172a', titleColor: '#94a3b8', bodyColor: '#e2e8f0',
            borderColor: '#1e3a5f', borderWidth: 1,
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private _renderChartClorofila() {
    const el = this.chartClorofilaRef?.nativeElement;
    if (!el || !this.bancos.length) return;
    const existing = this.charts.find(c => (c.canvas as any) === el);
    if (existing) { existing.destroy(); this.charts = this.charts.filter(c => c !== existing); }

    // Distribución de clorofila por zona geográfica
    const zonas = [
      { nombre: 'Norte',  lat_min: -8.0,  lat_max: -3.5 },
      { nombre: 'Centro', lat_min: -13.5, lat_max: -8.0 },
      { nombre: 'Sur',    lat_min: -18.5, lat_max: -13.5 },
    ];

    const labels: string[] = [];
    const chlData: number[] = [];
    const sstData: number[] = [];

    zonas.forEach(z => {
      const bancosZona = this.bancos.filter(b =>
        b.latitud >= z.lat_min && b.latitud < z.lat_max && b.clorofila != null
      );
      if (!bancosZona.length) return;
      labels.push(z.nombre);
      chlData.push(+(bancosZona.reduce((s, b) => s + (b.clorofila || 0), 0) / bancosZona.length).toFixed(2));
      sstData.push(+(bancosZona.reduce((s, b) => s + (b.temperatura || 0), 0) / bancosZona.length).toFixed(1));
    });

    if (!labels.length) return;

    const chart = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Clorofila (mg/m³)',
            data: chlData, yAxisID: 'y',
            borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)',
            borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#34d399',
            tension: 0.4, fill: true,
          },
          {
            label: 'SST (°C)',
            data: sstData, yAxisID: 'y1',
            borderColor: '#fb923c', backgroundColor: 'rgba(251,146,60,0.05)',
            borderWidth: 2, pointRadius: 5, pointBackgroundColor: '#fb923c',
            tension: 0.4, borderDash: [4, 3],
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } },
          tooltip: { backgroundColor: '#0f172a', titleColor: '#94a3b8', bodyColor: '#e2e8f0', borderColor: '#1e3a5f', borderWidth: 1 }
        },
        scales: {
          x:  { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
          y:  { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#34d399', font: { size: 10 } },
                position: 'left',  title: { display: true, text: 'Clorofila mg/m³', color: '#34d399', font: { size: 10 } } },
          y1: { grid: { display: false }, ticks: { color: '#fb923c', font: { size: 10 } },
                position: 'right', title: { display: true, text: 'SST °C', color: '#fb923c', font: { size: 10 } } }
        }
      }
    });
    this.charts.push(chart);
  }

  getBarHeight(valor: number): string {
    if (!this.reporte?.tendencia_semanal?.length) return '0%';
    const max = Math.max(...this.reporte.tendencia_semanal.map((d: any) => d.value)) || 1;
    return `${(valor / max) * 100}%`;
  }

  // ✅ FIX TS7053: Record<string,string> permite indexar con any sin error
  getManchaClass(intensidad: string): string {
    const map: Record<string, string> = {
      'ALTA':  'text-red-400 bg-red-900/30 border-red-700/40',
      'MEDIA': 'text-amber-400 bg-amber-900/30 border-amber-700/40',
      'BAJA':  'text-emerald-400 bg-emerald-900/30 border-emerald-700/40',
    };
    return map[intensidad] ?? 'text-slate-400 bg-slate-800 border-slate-700';
  }

  get condicionMarGeneral(): string {
    const { bancos_peligroso, bancos_precaucion, bancos_favorables } = this.kpiOceanico;
    const total = bancos_peligroso + bancos_precaucion + bancos_favorables || 1;
    if (bancos_peligroso / total > 0.3) return 'DESFAVORABLE';
    if (bancos_precaucion / total > 0.4) return 'PRECAUCION';
    return 'FAVORABLE';
  }

  get condicionColor(): string {
    const map: Record<string, string> = {
      'FAVORABLE': '#34d399', 'PRECAUCION': '#fbbf24', 'DESFAVORABLE': '#f87171'
    };
    return map[this.condicionMarGeneral] ?? '#64748b';
  }
}