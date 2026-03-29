import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'reportes.html',
})
export class ReportesComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('chartEspecies') chartEspeciesRef!: ElementRef;
  @ViewChild('chartDistancias') chartDistanciasRef!: ElementRef;

  estadisticas: any = null;
  historial:    any[] = [];
  cargando      = true;
  hoy           = new Date();
  private charts: any[] = [];

  capturaModal: any     = null;
  capturaValor          = 0;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.cargarDatos(); }
  ngAfterViewInit() {}
  ngOnDestroy() { this.charts.forEach(c => c.destroy()); }

  cargarDatos() {
    this.cargando = true;
    this.api.getEstadisticas().subscribe({
      next: (data: any) => {
        this.estadisticas = data;
        this.historial    = data.ultimas_rutas || [];
        this.cargando     = false;
        this.cdr.detectChanges();
        setTimeout(() => this.iniciarGraficos(), 300);
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  iniciarGraficos() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    if (!this.estadisticas) return;
    this.crearGraficoEspecies();
    this.crearGraficoDistancias();
  }

  crearGraficoEspecies() {
    if (!this.chartEspeciesRef || !this.estadisticas?.por_especie?.length) return;
    const datos = this.estadisticas.por_especie;
    this.charts.push(new Chart(this.chartEspeciesRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: datos.map((d: any) => d.especie),
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

  crearGraficoDistancias() {
    if (!this.chartDistanciasRef || !this.historial.length) return;
    const ultimas = this.historial.slice(0, 10).reverse();
    this.charts.push(new Chart(this.chartDistanciasRef.nativeElement, {
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

  exportarPDF() {
    window.print();
  }

  abrirModalCaptura(ruta: any) {
    this.capturaModal = ruta;
    this.capturaValor = ruta.captura_real || 0;
    this.cdr.detectChanges();
  }

  guardarCaptura() {
    if (!this.capturaModal) return;
    this.api.reportarCapturaRuta(this.capturaModal.id, this.capturaValor).subscribe({
      next: () => {
        this.capturaModal.captura_real = this.capturaValor;
        this.capturaModal              = null;
        this.cargarDatos();
        this.cdr.detectChanges();
      }
    });
  }
}