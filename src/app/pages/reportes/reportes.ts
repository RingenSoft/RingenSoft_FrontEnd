import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ChangeDetectorRef, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';

Chart.register(...registerables);

@Component({
  selector:    'app-reportes',
  standalone:  true,
  imports:     [CommonModule, SidebarComponent],
  templateUrl: 'reportes.html',
  styleUrl:    'reportes.css'
})
export class ReportesComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartTendencia') chartTendenciaRef!: ElementRef<HTMLCanvasElement>;

  data:       any  = null;
  cargando    = true;
  fechaActual = new Date();
  private chart: Chart | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit()       { this.cargarDatosAvanzados(); }
  ngAfterViewInit(){ /* chart se renderiza en cargarDatosAvanzados */ }
  ngOnDestroy()    { this.chart?.destroy(); }

  cargarDatosAvanzados() {
    this.cargando = true;
    this.api.getReportesAvanzados().subscribe({
      next: (res) => {
        this.data    = res;
        this.cargando = false;
        this.cdr.detectChanges();
        setTimeout(() => this._renderChart(), 80);
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  private _renderChart() {
    const el = this.chartTendenciaRef?.nativeElement;
    if (!el || !this.data?.tendencia_semanal?.length) return;
    this.chart?.destroy();

    const labels = this.data.tendencia_semanal.map((d: any) => d.label);
    const vals   = this.data.tendencia_semanal.map((d: any) => d.value);
    const maxVal = Math.max(...vals);

    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'TM proyectadas',
          data:  vals,
          backgroundColor: vals.map((v: number) =>
            v === maxVal ? 'rgba(56,189,248,0.85)' : 'rgba(56,189,248,0.2)'
          ),
          borderColor: vals.map((v: number) =>
            v === maxVal ? '#38bdf8' : 'rgba(56,189,248,0.4)'
          ),
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a', titleColor: '#94a3b8',
            bodyColor: '#38bdf8', borderColor: '#1e3a5f', borderWidth: 1,
            callbacks: { label: (ctx) => ` ${(ctx.parsed.y ?? 0).toFixed(0)} TM` }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' },
               ticks: { color: '#475569', font: { size: 10, weight: 'bold' } } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' },
               ticks: { color: '#475569', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getEstadoPct(valor: number): number {
    const total = this.data?.estado_flota?.reduce((s: number, e: any) => s + e.value, 0) || 1;
    return Math.round((valor / total) * 100);
  }

  descargarPDF() {
    if (!this.data) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('RingenSoft — Centro de Inteligencia', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${this.fechaActual.toLocaleString()}`, 14, 30);
    doc.setLineWidth(0.3);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(12);
    doc.text('Métricas principales', 14, 44);
    doc.setFontSize(10);
    doc.text(`• Biomasa detectada:  ${this.data.total_toneladas_detectadas?.toFixed(0)} TM`, 14, 54);
    doc.text(`• Capacidad activa:   ${this.data.flota_capacidad_total?.toFixed(0)} TM`, 14, 62);
    doc.text(`• CO₂ evitado:        ${this.data.ahorro_carbono?.toFixed(0)} kg`, 14, 70);
    doc.text(`• Zona más activa:    ${this.data.zonas_mas_activas || '—'}`, 14, 78);

    if (this.data.top_barcos?.length) {
      doc.setFontSize(12);
      doc.text('Ranking de productividad', 14, 96);
      doc.setFontSize(10);
      this.data.top_barcos.slice(0, 5).forEach((b: any, i: number) => {
        doc.text(`${i + 1}. ${b.nombre}  —  ${b.captura_total?.toFixed(0)} TM  (${b.eficiencia?.toFixed(0)}%)`, 14, 106 + i * 8);
      });
    }

    doc.save(`reporte_ringensoft_${Date.now()}.pdf`);
  }
}