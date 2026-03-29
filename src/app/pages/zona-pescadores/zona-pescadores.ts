import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';

interface Avistamiento {
  id: string;
  especie: string;
  zona: string;
  descripcion: string;
  fecha: string;
  votos: number;
  votado: boolean;
}

@Component({
  selector: 'app-zona-pescadores',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'zona-pescadores.html',
  styleUrl: 'zona-pescadores.css'
})
export class ZonaPescadoresComponent implements OnInit {

  avistamientos: Avistamiento[] = [];
  mostrarFormulario = false;

  puertos = [
    'PAITA', 'TALARA', 'CHICAMA', 'SALAVERRY', 'CHIMBOTE',
    'COISHCO', 'HUARMEY', 'SUPE', 'HUACHO', 'CALLAO',
    'PISCO', 'ILO', 'MATARANI', 'MOLLENDO', 'QUILCA'
  ];

  especies = ['ANCHOVETA', 'BONITO', 'CABALLA', 'JUREL'];

  nuevoAvistamiento = {
    especie: 'ANCHOVETA',
    zona: 'CHIMBOTE',
    descripcion: ''
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarAvistamientos();
  }

  cargarAvistamientos() {
    const data = localStorage.getItem('fishroute_avistamientos');
    this.avistamientos = data ? JSON.parse(data) : [];
  }

  private guardarAvistamientos() {
    localStorage.setItem('fishroute_avistamientos', JSON.stringify(this.avistamientos));
  }

  reportarAvistamiento() {
    if (!this.nuevoAvistamiento.descripcion.trim()) {
      alert('La descripción es obligatoria');
      return;
    }

    const avistamiento: Avistamiento = {
      id: Date.now().toString(),
      especie: this.nuevoAvistamiento.especie,
      zona: this.nuevoAvistamiento.zona,
      descripcion: this.nuevoAvistamiento.descripcion.trim(),
      fecha: new Date().toISOString(),
      votos: 0,
      votado: false
    };

    this.avistamientos.unshift(avistamiento);
    this.guardarAvistamientos();
    this.nuevoAvistamiento = { especie: 'ANCHOVETA', zona: 'CHIMBOTE', descripcion: '' };
    this.mostrarFormulario = false;
    this.cdr.detectChanges();
  }

  votar(avistamiento: Avistamiento) {
    if (avistamiento.votado) return;
    avistamiento.votos++;
    avistamiento.votado = true;
    this.guardarAvistamientos();
    this.cdr.detectChanges();
  }

  tiempoTranscurrido(fecha: string): string {
    const diffMs = new Date().getTime() - new Date(fecha).getTime();
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
