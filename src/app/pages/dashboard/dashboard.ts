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

  @ViewChild('chartTemp') chartTempRef!: ElementRef;
  @ViewChild('chartEspecies') chartEspeciesRef!: ElementRef;

  condiciones: any   = null;
  puertos: any[]     = [];
  historial: any[]   = [];
  cargando           = true;
  errorCarga         = false;
  private charts: any[] = [];
  // KPIs calculados del historial
  totalRutas         = 0;
  totalKm            = 0;
  totalCargaTm       = 0;
  mejorFishScore     = 0;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarDatos();
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }

  cargarDatos() {
    this.cargando = true;

    this.api.getCondiciones(-12.05, -77.15, 'ANCHOVETA').subscribe({
      next: (data: any) => {
        this.condiciones = data;
        this.cargando    = false;
        this.cdr.detectChanges();
        setTimeout(() => this.iniciarGraficos(), 300);
      },
      error: () => { this.cargando = false; this.errorCarga = true; }
    });

    this.api.getPuertos().subscribe({
      next: (data: any) => { this.puertos = data.puertos; this.cdr.detectChanges(); }
    });

    this.api.getHistorial().subscribe({
      next: (data: any) => {
        this.historial    = data.rutas || [];
        this.totalRutas   = this.historial.length;
        this.totalKm      = Math.round(this.historial.reduce((s: number, r: any) => s + (r.distancia_km || 0), 0));
        this.totalCargaTm = Math.round(this.historial.reduce((s: number, r: any) => s + (r.carga_estimada || 0), 0) * 10) / 10;
        this.cdr.detectChanges();
      }
    });
  }

  iniciarGraficos() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    this.crearGraficoEspecies();
    this.crearGraficoRutas();
  }

  crearGraficoEspecies() {
    if (!this.chartEspeciesRef || !this.historial.length) return;
    const conteo: any = {};
    this.historial.forEach((r: any) => {
      conteo[r.especie] = (conteo[r.especie] || 0) + 1;
    });
    const chart = new Chart(this.chartEspeciesRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: Object.keys(conteo),
        datasets: [{
          data: Object.values(conteo),
          backgroundColor: ['#1D9E75', '#378ADD', '#F59E0B', '#E24B4A'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
      }
    });
    this.charts.push(chart);
  }

  crearGraficoRutas() {
    if (!this.chartTempRef || !this.historial.length) return;
    const ultimas = this.historial.slice(0, 10).reverse();
    const chart = new Chart(this.chartTempRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ultimas.map((_: any, i: number) => `Ruta ${i + 1}`),
        datasets: [
          {
            label: 'Distancia (km)',
            data: ultimas.map((r: any) => r.distancia_km || 0),
            backgroundColor: '#378ADD',
            borderRadius: 6,
          },
          {
            label: 'Carga est. (TM×10)',
            data: ultimas.map((r: any) => (r.carga_estimada || 0) * 10),
            backgroundColor: '#1D9E75',
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } } }
      }
    });
    this.charts.push(chart);
  }

  getColorAlerta(nivel: string): string {
    if (nivel === 'ROJO')     return '#E24B4A';
    if (nivel === 'AMARILLO') return '#F59E0B';
    return '#1D9E75';
  }
}