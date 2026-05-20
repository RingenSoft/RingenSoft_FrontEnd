import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ApiService } from '../../services/api.service';
import { ESPECIES } from '../../constants/app.constants';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: 'bitacora.html'
})
export class BitacoraComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly especies = ESPECIES;

  // Estado
  cargando    = signal(true);
  enviando    = signal(false);
  mostrarForm = signal(false);

  // Datos
  entradas: any[] = [];
  resumen: any = null;
  total = 0;
  pagina = 1;
  readonly limite = 15;

  // Filtros
  especieFiltro = '';

  // Formulario nueva entrada
  form = {
    especie:       ESPECIES[0] ?? 'ANCHOVETA',
    kilos:         0,
    zona_nombre:   '',
    precio_kg:     0,
    condicion_mar: '',
    notas:         '',
    id_embarcacion: ''
  };
  embarcaciones: any[] = [];
  mensajeOk = '';
  mensajeError = '';

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarEmbarcaciones();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.api.getBitacora(this.pagina, this.limite, this.especieFiltro || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.entradas = res.entradas ?? [];
          this.total    = res.total ?? 0;
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });

    this.api.getBitacoraResumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: r => this.resumen = r, error: () => {} });
  }

  cargarEmbarcaciones(): void {
    this.api.getEmbarcaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: e => this.embarcaciones = e, error: () => {} });
  }

  aplicarFiltro(): void {
    this.pagina = 1;
    this.cargarDatos();
  }

  cambiarPagina(delta: number): void {
    const maxPag = Math.ceil(this.total / this.limite);
    const nueva = this.pagina + delta;
    if (nueva < 1 || nueva > maxPag) return;
    this.pagina = nueva;
    this.cargarDatos();
  }

  guardarEntrada(): void {
    if (!this.form.especie || this.form.kilos <= 0) {
      this.mensajeError = 'Completa especie y kilos';
      return;
    }
    this.enviando.set(true);
    this.mensajeError = '';
    const datos: any = {
      especie:       this.form.especie,
      kilos:         this.form.kilos,
      zona_nombre:   this.form.zona_nombre  || undefined,
      precio_kg:     this.form.precio_kg    || undefined,
      condicion_mar: this.form.condicion_mar || undefined,
      notas:         this.form.notas        || undefined,
      id_embarcacion:this.form.id_embarcacion || undefined
    };
    this.api.crearEntradaBitacora(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.mensajeOk = 'Captura registrada';
          this.mostrarForm.set(false);
          this.form = { especie: ESPECIES[0] ?? 'ANCHOVETA', kilos: 0, zona_nombre: '', precio_kg: 0, condicion_mar: '', notas: '', id_embarcacion: '' };
          this.pagina = 1;
          this.cargarDatos();
          setTimeout(() => this.mensajeOk = '', 3500);
        },
        error: () => {
          this.enviando.set(false);
          this.mensajeError = 'Error al guardar. Intenta de nuevo.';
        }
      });
  }

  get totalPaginas(): number { return Math.max(1, Math.ceil(this.total / this.limite)); }

  condicionColor(cond: string): string {
    if (!cond) return 'var(--text-label)';
    const c = cond.toUpperCase();
    if (c === 'BUENA' || c === 'CALMA') return 'var(--accent-green)';
    if (c === 'MODERADA') return 'var(--accent-amber)';
    return 'var(--accent-red)';
  }
}
