import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-zona-pescadores',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'zona-pescadores.html',
  styleUrl: 'zona-pescadores.css'
})
export class ZonaPescadoresComponent implements OnInit {

  avistamientos:    any[] = [];
  mostrarFormulario = false;
  cargando          = true;
  enviando          = false;
  // IDs votados en esta sesión (evita doble voto visual)
  private votados   = new Set<number>();

  puertos = [
    'PAITA', 'TALARA', 'CHICAMA', 'SALAVERRY', 'CHIMBOTE',
    'COISHCO', 'HUARMEY', 'SUPE', 'HUACHO', 'CALLAO',
    'PISCO', 'ILO', 'MATARANI', 'MOLLENDO', 'QUILCA'
  ];

  especies = ['ANCHOVETA', 'BONITO', 'CABALLA', 'JUREL'];

  nuevoAvistamiento = {
    especie:     'ANCHOVETA',
    zona:        'CHIMBOTE',
    descripcion: ''
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarAvistamientos();
  }

  cargarAvistamientos() {
    this.cargando = true;
    this.api.getAvistamientos().subscribe({
      next: (data: any[]) => {
        this.avistamientos = data;
        this.cargando      = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  reportarAvistamiento() {
    if (!this.nuevoAvistamiento.descripcion.trim()) {
      alert('La descripción es obligatoria');
      return;
    }
    this.enviando = true;
    this.api.crearAvistamiento(this.nuevoAvistamiento).subscribe({
      next: (nuevo: any) => {
        this.avistamientos.unshift(nuevo);
        this.nuevoAvistamiento = { especie: 'ANCHOVETA', zona: 'CHIMBOTE', descripcion: '' };
        this.mostrarFormulario = false;
        this.enviando          = false;
        this.cdr.detectChanges();
      },
      error: () => { this.enviando = false; alert('Error al publicar avistamiento.'); }
    });
  }

  votar(avistamiento: any) {
    if (this.votados.has(avistamiento.id)) return;
    this.api.votarAvistamiento(avistamiento.id).subscribe({
      next: (res: any) => {
        avistamiento.votos = res.votos;
        this.votados.add(avistamiento.id);
        this.cdr.detectChanges();
      }
    });
  }

  yaVotado(id: number): boolean {
    return this.votados.has(id);
  }

  tiempoTranscurrido(fecha: string): string {
    const diffMs  = new Date().getTime() - new Date(fecha).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHrs / 24);
    if (diffMin < 1)  return 'hace un momento';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHrs < 24) return `hace ${diffHrs}h`;
    return `hace ${diffDias}d`;
  }

  especieColor(especie: string): string {
    const colores: Record<string, string> = {
      'ANCHOVETA': 'bg-blue-100 text-blue-700',
      'BONITO':    'bg-orange-100 text-orange-700',
      'CABALLA':   'bg-green-100 text-green-700',
      'JUREL':     'bg-purple-100 text-purple-700'
    };
    return colores[especie] ?? 'bg-slate-100 text-slate-700';
  }
}
