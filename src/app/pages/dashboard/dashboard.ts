import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('chartRutas')    chartRutasRef!: ElementRef;
  @ViewChild('chartEspecies') chartEspeciesRef!: ElementRef;

  condiciones:  any    = null;
  estadisticas: any    = null;
  embarcaciones: any[] = [];
  cargando             = true;
  errorCarga           = false;
  private charts: any[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit()       { this.cargarDatos(); }
  ngAfterViewInit() {}
  ngOnDestroy()    { this.charts.forEach(c => c.destroy()); }

  cargarDatos() {
    this.cargando = true;

    // Condiciones meteoceanográficas (banner de alerta)
    this.api.getCondiciones(-9.07, -78.59, 'ANCHOVETA').subscribe({
      next: (data: any) => {
        this.condiciones = data;
        this.cargando    = false;
        this.cdr.detectChanges();
        setTimeout(() => this.iniciarGraficos(), 300);
      },
      error: () => { this.cargando = false; this.errorCarga = true; this.cdr.detectChanges(); }
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
}
