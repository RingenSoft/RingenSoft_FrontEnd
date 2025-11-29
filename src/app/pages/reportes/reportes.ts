import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTAR ESTO
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

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

  // Inyectamos el detector de cambios
  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarDatosAvanzados();
  }

  cargarDatosAvanzados() {
    this.api.getReportesAvanzados().subscribe({
      next: (res) => {
        console.log("Reportes cargados:", res);
        this.data = res;
        // La línea mágica que quita el "Cargando...":
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error cargando reportes:", err);
        // Aquí podrías poner una variable de error si quieres
        this.cdr.detectChanges();
      }
    });
  }
}
