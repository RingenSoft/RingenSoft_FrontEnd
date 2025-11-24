import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTANTE
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
// Si usas ng2-charts u otra librería, impórtala aquí, si no, usamos HTML/CSS puro
// Para este ejemplo usaremos HTML/CSS puro para las barras para evitar errores de dependencias

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
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
    this.cdr.detectChanges(); // Forzar vista de spinner

    this.api.getReportesAvanzados().subscribe({
      next: (data) => {
        console.log("Dashboard Data:", data);
        this.reporte = data;
        this.cargando = false;
        this.cdr.detectChanges(); // <--- LA SOLUCIÓN: Actualizar vista
      },
      error: (err) => {
        console.error("Error dashboard:", err);
        this.cargando = false;
        this.errorCarga = true;
        this.cdr.detectChanges();
      }
    });
  }

  // Función auxiliar para calcular altura de barras CSS (0 a 100%)
  getBarHeight(valor: number): string {
    if (!this.reporte) return '0%';
    const max = Math.max(...this.reporte.tendencia_semanal.map((d: any) => d.value)) || 1;
    const porcentaje = (valor / max) * 100;
    return `${porcentaje}%`;
  }
}
