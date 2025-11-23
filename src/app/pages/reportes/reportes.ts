import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import {SidebarComponent} from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: 'reportes.html',
  styleUrl: 'reportes.css'
})
export class ReportesComponent implements OnInit {

  data: any = null;
  fechaActual = new Date();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarDatosAvanzados();
  }

  cargarDatosAvanzados() {
    // Llamamos al nuevo endpoint que creamos en el ApiService
    this.api.getReportesAvanzados().subscribe({
      next: (res) => {
        // Asignamos la respuesta a la variable data
        // El HTML detectará que 'data' ya no es null y mostrará el dashboard
        this.data = res;
      },
      error: (err) => {
        console.error("Error cargando reportes:", err);
      }
    });
  }
}
