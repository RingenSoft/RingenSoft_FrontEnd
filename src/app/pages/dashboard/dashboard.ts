import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

// Importamos Chart.js nativo
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('lineChart') lineChartRef!: ElementRef;
  @ViewChild('doughnutChart') doughnutChartRef!: ElementRef;

  lineChartInstance: any;
  doughnutChartInstance: any;

  reporte: any = null;
  cargando: boolean = true;
  errorCarga: boolean = false;
  fechaActual = new Date();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarDatos();
    setInterval(() => { this.fechaActual = new Date(); }, 60000);
  }

  ngAfterViewInit() {
    // Si la data ya llegó, dibujamos
    if (this.reporte) this.renderCharts();
  }

  cargarDatos() {
    this.cargando = true;
    this.errorCarga = false;

    this.api.getReportesAvanzados().subscribe({
      next: (data) => {
        this.reporte = data;
        this.cargando = false;
        this.cdr.detectChanges(); // Forzamos actualización de vista
        
        // Esperamos un tick para que Angular dibuje el <canvas> y luego inyectamos Chart.js
        setTimeout(() => this.renderCharts(), 50);
      },
      error: (err) => {
        this.cargando = false;
        this.errorCarga = true;
        this.cdr.detectChanges();
      }
    });
  }

  renderCharts() {
    if (this.lineChartInstance) this.lineChartInstance.destroy();
    if (this.doughnutChartInstance) this.doughnutChartInstance.destroy();

    if (!this.lineChartRef || !this.doughnutChartRef) return;

    // 1. Crear Gradiente para el Gráfico de Líneas
    const ctxLine = this.lineChartRef.nativeElement.getContext('2d');
    const gradient = ctxLine.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // Azul semi transparente
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)'); // Transparente

    const labels = this.reporte.tendencia_semanal.map((d: any) => d.label);
    const data = this.reporte.tendencia_semanal.map((d: any) => d.value);

    // CONFIGURACIÓN GRÁFICO DE LÍNEAS
    this.lineChartInstance = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Extracción (TM)',
          data: data,
          borderColor: '#3b82f6', // Azul Tailwind
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4 // Hace la línea curva y suave
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { size: 13 },
            bodyFont: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' },
            border: { display: false }
          },
          x: { 
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });

    // CONFIGURACIÓN GRÁFICO DE DONA (Materiales)
    const ctxDoughnut = this.doughnutChartRef.nativeElement.getContext('2d');
    const matLabels = this.reporte.distribucion_materiales.map((m: any) => m.material);
    const matData = this.reporte.distribucion_materiales.map((m: any) => m.cantidad);
    
    // Asignar colores según material
    const colores = matLabels.map((l: string) => {
      if (l.includes('ACERO')) return '#334155'; // slate-700
      if (l.includes('MADERA')) return '#f59e0b'; // amber-500
      return '#06b6d4'; // cyan-500
    });

    this.doughnutChartInstance = new Chart(ctxDoughnut, {
      type: 'doughnut',
      data: {
        labels: matLabels,
        datasets: [{
          data: matData,
          backgroundColor: colores,
          borderWidth: 0,
          hoverOffset: 10 // Efecto al pasar el mouse
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%', // Grosor de la dona
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
        }
      }
    });
  }
}