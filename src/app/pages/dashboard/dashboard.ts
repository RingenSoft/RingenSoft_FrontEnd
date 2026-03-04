import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTANTE
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import {RouterLink} from '@angular/router';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent,RouterLink],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.css'
})
export class DashboardComponent implements OnInit {

  reporte: any = null;
  cargando: boolean = true;
  errorCarga: boolean = false;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.errorCarga = false;
    this.cdr.detectChanges();

    this.api.getReportesAvanzados().subscribe({
      next: (data) => {
        console.log("Dashboard Data:", data);
        this.reporte = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error dashboard:", err);
        this.cargando = false;
        this.errorCarga = true;
        this.cdr.detectChanges();
      }
    });
  }

  getBarHeight(valor: number): string {
    if (!this.reporte) return '0%';
    const max = Math.max(...this.reporte.tendencia_semanal.map((d: any) => d.value)) || 1;
    const porcentaje = (valor / max) * 100;
    return `${porcentaje}%`;
  }
}
