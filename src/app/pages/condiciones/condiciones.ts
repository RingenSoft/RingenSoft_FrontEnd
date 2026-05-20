import { Component, OnInit, OnDestroy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ESPECIES } from '../../constants/app.constants';

interface CondicionPuerto {
  id:       string;
  nombre:   string;
  lat:      number;
  lon:      number;
  cargando: boolean;
  error:    boolean;
  datos:    any;
}

@Component({
  selector: 'app-condiciones',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'condiciones.html',
})
export class CondicionesComponent implements OnInit, OnDestroy {

  puertos:              CondicionPuerto[] = [];
  especieSeleccionada = 'ANCHOVETA';
  readonly especies   = ESPECIES;
  cargandoTotal       = true;
  completados         = 0;
  private timerActualizacion: ReturnType<typeof setInterval> | undefined;
  private readonly destroyRef = inject(DestroyRef);

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarPuertosYCondiciones();
    this.timerActualizacion = setInterval(() => this.cargarCondiciones(), 5 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.timerActualizacion) clearInterval(this.timerActualizacion);
  }

  cargarPuertosYCondiciones() {
    this.api.getPuertos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.puertos = (data.puertos || []).map(p => ({
          id:       p.id,
          nombre:   p.nombre,
          lat:      p.lat,
          lon:      p.lon,
          cargando: true,
          error:    false,
          datos:    null,
        }));
        this.cdr.detectChanges();
        this.cargarCondiciones();
      }
    });
  }

  cargarCondiciones() {
    this.completados   = 0;
    this.cargandoTotal = true;
    this.puertos.forEach(p => { p.cargando = true; p.error = false; p.datos = null; });
    this.cdr.detectChanges();

    this.puertos.forEach(puerto => {
      this.api.getCondiciones(puerto.lat, puerto.lon, this.especieSeleccionada)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (d: any) => {
            puerto.datos    = d;
            puerto.cargando = false;
            this.completados++;
            if (this.completados === this.puertos.length) this.cargandoTotal = false;
            this.cdr.detectChanges();
          },
          error: () => {
            puerto.error    = true;
            puerto.cargando = false;
            this.completados++;
            if (this.completados === this.puertos.length) this.cargandoTotal = false;
            this.cdr.detectChanges();
          }
        });
    });
  }

  get puertosOrdenados(): CondicionPuerto[] {
    return [...this.puertos].sort((a, b) => {
      const sa = a.datos?.fish_score_preliminar ?? -1;
      const sb = b.datos?.fish_score_preliminar ?? -1;
      return sb - sa;
    });
  }

  get resumen() {
    const conDatos   = this.puertos.filter(p => p.datos);
    const verdes     = conDatos.filter(p => p.datos.clima?.alerta?.nivel === 'VERDE').length;
    const amarillos  = conDatos.filter(p => p.datos.clima?.alerta?.nivel === 'AMARILLO').length;
    const rojos      = conDatos.filter(p => p.datos.clima?.alerta?.nivel === 'ROJO').length;
    const scores     = conDatos.map(p => p.datos.fish_score_preliminar ?? 0);
    const mejorFishScore = scores.length ? Math.max(...scores) : 0;
    return { verdes, amarillos, rojos, mejorFishScore };
  }

  nivelClase(nivel: string): string {
    if (nivel === 'VERDE')    return 'bg-green-100 text-green-700';
    if (nivel === 'AMARILLO') return 'bg-yellow-100 text-yellow-700';
    if (nivel === 'ROJO')     return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-400';
  }

  fishScoreClase(score: number): string {
    if (score >= 70) return 'text-green-600 font-black';
    if (score >= 45) return 'text-yellow-600 font-black';
    return 'text-red-500 font-black';
  }
}
