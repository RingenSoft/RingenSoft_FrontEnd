import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ApiService } from '../../services/api.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: 'reportes.html'
})
export class ReportesComponent implements OnInit {
  @ViewChild('reportePDF', { static: false }) reporteElement!: ElementRef;

  cargando = true;
  flota: any[] = [];
  fechaReporte = new Date();

  analisis_mantenimiento: any[] = [];
  eficiencia_global = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getEmbarcaciones().subscribe({
      next: (data) => {
        this.flota = data;
        this.generarAnalisisPredictivo();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  generarAnalisisPredictivo() {
    let scoreTotal = 0;

    this.analisis_mantenimiento = this.flota.map(nave => {
      const edad = this.fechaReporte.getFullYear() - (nave.anio_fabricacion || 2010);

      // ✅ CORRECCIÓN: el backend envía "material" (no "material_casco")
      //    _embarcacion_to_response() mapea material_casco → material
      const materialNave = (nave.material || '').toUpperCase();

      let riesgo = (edad * 2.5) + ((nave.consumo || 0) * 10);
      if (nave.estado === 'MANTENIMIENTO')        riesgo += 30;
      if (materialNave.includes('MADERA'))        riesgo += 15;
      if (materialNave.includes('FIBRA'))         riesgo += 5;

      riesgo = Math.min(100, Math.max(10, riesgo));
      const salud = 100 - riesgo;
      scoreTotal += salud;

      let recomendacion = 'Operación Normal';
      if (riesgo > 75)      recomendacion = 'Requiere inspección de motor urgente (IA Anomaly)';
      else if (riesgo > 50) recomendacion = 'Programar dique seco próximo trimestre';

      return {
        ...nave,
        riesgo_falla: Math.round(riesgo),
        salud_pct:    Math.round(salud),
        recomendacion
      };
    });

    this.analisis_mantenimiento.sort((a, b) => b.riesgo_falla - a.riesgo_falla);
    this.eficiencia_global = Math.round(scoreTotal / (this.flota.length || 1));
  }

  exportarPDF() {
    const DATA = this.reporteElement.nativeElement;
    const btn  = document.getElementById('btn-exportar');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

    html2canvas(DATA, { scale: 2, useCORS: true }).then(canvas => {
      const fileWidth  = 208;
      const fileHeight = (canvas.height * fileWidth) / canvas.width;
      const FILEURI    = canvas.toDataURL('image/png');
      const PDF        = new jsPDF('p', 'mm', 'a4');

      PDF.addImage(FILEURI, 'PNG', 0, 0, fileWidth, fileHeight);
      PDF.save(`Reporte_Flota_${this.fechaReporte.getTime()}.pdf`);

      if (btn) btn.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar a PDF';
    });
  }
}