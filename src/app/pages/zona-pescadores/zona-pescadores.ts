import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { AuthService } from '../../services/auth';
import { ESPECIES } from '../../constants/app.constants';
import { environment } from '../../../environments/environment';

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
  errorMsg          = '';
  private votados   = new Set<number>();

  puertos = [
    'PAITA', 'TALARA', 'CHICAMA', 'SALAVERRY', 'CHIMBOTE',
    'COISHCO', 'HUARMEY', 'SUPE', 'HUACHO', 'CALLAO',
    'PISCO', 'ILO', 'MATARANI', 'MOLLENDO', 'QUILCA'
  ];

  readonly especies = ESPECIES;

  nuevoAvistamiento = {
    especie:     'ANCHOVETA',
    zona:        'CHIMBOTE',
    descripcion: ''
  };
  fotoSeleccionada: File | null = null;
  fotoPreview: string | null = null;

  // --- Chat ---
  mensajes:       any[] = [];
  cargandoChat    = false;
  enviandoMensaje = false;
  textoMensaje    = '';
  tipoMensaje     = 'GENERAL';
  miNombre        = '';
  private chatInterval: ReturnType<typeof setInterval> | undefined;
  private ws?: WebSocket;

  tiposMensaje = [
    { id: 'GENERAL',   label: 'General',  emoji: '💬' },
    { id: 'ALERTA',    label: 'Alerta',   emoji: '⚠️' },
    { id: 'PREGUNTA',  label: 'Pregunta', emoji: '❓' },
    { id: 'OFERTA',    label: 'Oferta',   emoji: '🤝' },
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.miNombre = this.authService.getUsuarioActual() || 'Tú';
    this.cargarAvistamientos();
    this.cargarMensajes();
    this.conectarWebSocket();
  }

  ngOnDestroy() {
    if (this.chatInterval) clearInterval(this.chatInterval);
    this.ws?.close();
  }

  private conectarWebSocket() {
    try {
      const proto  = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsBase = environment.apiUrl.replace(/^https?/, proto).replace(/\/api\/v2$/, '');
      const wsUrl  = `${wsBase}/api/v2/ws/chat`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'history') {
          this.mensajes = data.mensajes;
          this.cdr.detectChanges();
          setTimeout(() => this.scrollChat(), 100);
        } else if (data.type === 'mensaje') {
          const existe = this.mensajes.some((m: any) => m.id === data.id);
          if (!existe) {
            this.mensajes.push(data);
            this.cdr.detectChanges();
            setTimeout(() => this.scrollChat(), 100);
          }
        }
      };

      this.ws.onerror = () => {
        // Fallback a polling si WS no disponible
        this.ws = undefined;
        this.chatInterval = setInterval(() => {
          if (this.tab === 'chat') this.cargarMensajes(true);
        }, 15000);
      };

      // Ping keepalive cada 25 s
      setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    } catch {
      this.chatInterval = setInterval(() => {
        if (this.tab === 'chat') this.cargarMensajes(true);
      }, 15000);
    }
  }

  // =================== Avistamientos ===================

  cargarAvistamientos() {
    this.cargando = true;
    this.api.getAvistamientos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.avistamientos = data;
        this.cargando      = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg = 'La imagen no puede superar 5 MB';
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
      return;
    }
    this.fotoSeleccionada = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.fotoPreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  reportarAvistamiento() {
    if (!this.nuevoAvistamiento.descripcion.trim()) {
      this.errorMsg = 'La descripción es obligatoria';
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
      this.cdr.detectChanges();
      return;
    }
    this.enviando = true;

    const obs$ = this.fotoSeleccionada
      ? this.api.crearAvistamientoConFoto(this.nuevoAvistamiento, this.fotoSeleccionada)
      : this.api.crearAvistamiento(this.nuevoAvistamiento);

    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (nuevo: any) => {
          this.avistamientos.unshift(nuevo);
          this.nuevoAvistamiento = { especie: 'ANCHOVETA', zona: 'CHIMBOTE', descripcion: '' };
          this.fotoSeleccionada  = null;
          this.fotoPreview       = null;
          this.mostrarFormulario = false;
          this.enviando          = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.enviando = false;
          this.errorMsg = 'Error al publicar avistamiento.';
          setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
          this.cdr.detectChanges();
        }
      });
  }

  votar(avistamiento: any) {
    if (this.votados.has(avistamiento.id)) return;
    this.api.votarAvistamiento(avistamiento.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
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
    this.api.getMensajes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.mensajes     = data;
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
    this.api.enviarMensaje({ texto: this.textoMensaje, tipo: this.tipoMensaje })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msg: any) => {
          this.mensajes.push(msg);
          this.textoMensaje    = '';
          this.tipoMensaje     = 'GENERAL';
          this.enviandoMensaje = false;
          this.cdr.detectChanges();
          setTimeout(() => this.scrollChat(), 100);
        },
        error: () => { this.enviandoMensaje = false; this.cdr.detectChanges(); }
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
    const diffMs   = new Date().getTime() - new Date(fecha).getTime();
    const diffMin  = Math.floor(diffMs / 60000);
    const diffHrs  = Math.floor(diffMin / 60);
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
