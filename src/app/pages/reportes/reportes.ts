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

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarDatosAvanzados();
  }

  cargarDatosAvanzados() {
    this.api.getReportesAvanzados().subscribe({
      next: (res) => {
        console.log("Reportes cargados:", res);
        this.data = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error cargando reportes:", err);
        this.cdr.detectChanges();
      }
    });
  }
}
