import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
export class ZonaPescadoresComponent implements OnInit, OnDestroy {

  @ViewChild('chatBottom') chatBottomRef!: ElementRef;

  tab: 'avistamientos' | 'chat' = 'avistamientos';

  // --- Avistamientos ---
  avistamientos:    any[] = [];
  mostrarFormulario = false;
  cargando          = true;
  enviando          = false;
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

  // --- Chat ---
  mensajes:       any[] = [];
  cargandoChat    = false;
  enviandoMensaje = false;
  textoMensaje    = '';
  tipoMensaje     = 'GENERAL';
  miNombre        = '';
  private chatInterval: any;

  tiposMensaje = [
    { id: 'GENERAL',   label: 'General',  emoji: '💬' },
    { id: 'ALERTA',    label: 'Alerta',   emoji: '⚠️' },
    { id: 'PREGUNTA',  label: 'Pregunta', emoji: '❓' },
    { id: 'OFERTA',    label: 'Oferta',   emoji: '🤝' },
  ];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.miNombre = localStorage.getItem('usuario') || 'Tú';
    this.cargarAvistamientos();
    this.cargarMensajes();
    this.chatInterval = setInterval(() => {
      if (this.tab === 'chat') this.cargarMensajes(true);
    }, 15000);
  }

  ngOnDestroy() {
    if (this.chatInterval) clearInterval(this.chatInterval);
  }

  // =================== Avistamientos ===================

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

  yaVotado(id: number): boolean { return this.votados.has(id); }

  // =================== Chat ===================

  cargarMensajes(silencioso = false) {
    if (!silencioso) this.cargandoChat = true;
    this.api.getMensajes().subscribe({
      next: (data: any[]) => {
        this.mensajes    = data;
        this.cargandoChat = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollChat(), 100);
      },
      error: () => { this.cargandoChat = false; this.cdr.detectChanges(); }
    });
  }

  enviarMensaje() {
    if (!this.textoMensaje.trim()) return;
    this.enviandoMensaje = true;
    this.api.enviarMensaje({ texto: this.textoMensaje, tipo: this.tipoMensaje }).subscribe({
      next: (msg: any) => {
        this.mensajes.push(msg);
        this.textoMensaje    = '';
        this.tipoMensaje     = 'GENERAL';
        this.enviandoMensaje = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollChat(), 100);
      },
      error: () => { this.enviandoMensaje = false; }
    });
  }

  scrollChat() {
    if (this.chatBottomRef) {
      this.chatBottomRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  esMio(msg: any): boolean {
    return msg.autor === this.miNombre;
  }

  tipoBadge(tipo: string): string {
    const map: Record<string, string> = {
      'ALERTA':   'bg-red-900/40 text-red-300 border border-red-700/40',
      'PREGUNTA': 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
      'OFERTA':   'bg-green-900/40 text-green-300 border border-green-700/40',
      'GENERAL':  '',
    };
    return map[tipo] || '';
  }

  tipoEmoji(tipo: string): string {
    const t = this.tiposMensaje.find(t => t.id === tipo);
    return t ? t.emoji : '💬';
  }

  // =================== Shared ===================

  tiempoTranscurrido(fecha: string): string {
    const diffMs  = new Date().getTime() - new Date(fecha).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHrs / 24);
    if (diffMin < 1)  return 'ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    if (diffHrs < 24) return `hace ${diffHrs}h`;
    return `hace ${diffDias}d`;
  }

  especieColor(especie: string): string {
    const colores: Record<string, string> = {
      'ANCHOVETA': 'bg-blue-900/50 text-blue-300',
      'BONITO':    'bg-orange-900/50 text-orange-300',
      'CABALLA':   'bg-green-900/50 text-green-300',
      'JUREL':     'bg-purple-900/50 text-purple-300'
    };
    return colores[especie] ?? 'bg-slate-700 text-slate-300';
  }
}
