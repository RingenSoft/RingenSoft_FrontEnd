import { Component, OnInit, OnDestroy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './perfil.html',
})
export class PerfilComponent implements OnInit, OnDestroy {

  usuario = {
    nombre_completo:  '',
    username:         '',
    zona_habitual:    'CHIMBOTE',
    tipo_pescador:    'ARTESANAL',
    anos_experiencia: 5,
    licencia_pesca:   '',
    telefono:         '',
  };

  historial: any[] = [];
  totalRutas       = 0;
  totalKm          = 0;
  totalCargaTm     = 0;
  especieFavorita  = '';
  guardado         = false;
  errorGuardado    = false;
  puertos: any[]   = [];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.usuario.username = this.authService.getIdUsuario() || '';

    this.api.getPerfil().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d: any) => {
        this.usuario = {
          nombre_completo:  d.nombre_completo || this.authService.getUsuarioActual() || '',
          username:         d.username || this.usuario.username,
          zona_habitual:    d.zona_habitual   || 'CHIMBOTE',
          tipo_pescador:    d.tipo_pescador   || 'ARTESANAL',
          anos_experiencia: d.anos_experiencia ?? 5,
          licencia_pesca:   d.licencia_pesca  || '',
          telefono:         d.telefono        || '',
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.usuario.nombre_completo = this.authService.getUsuarioActual() || '';
        this.cdr.detectChanges();
      }
    });

    this.api.getPuertos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => { this.puertos = d.puertos; this.cdr.detectChanges(); }
    });

    this.api.getHistorial().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.historial    = data.rutas || [];
        this.totalRutas   = this.historial.length;
        this.totalKm      = Math.round(this.historial.reduce((s, r) => s + (r.distancia_km || 0), 0));
        this.totalCargaTm = Math.round(this.historial.reduce((s, r) => s + (r.carga_estimada || 0), 0) * 10) / 10;
        const conteo: Record<string, number> = {};
        this.historial.forEach(r => { conteo[r.especie] = (conteo[r.especie] || 0) + 1; });
        this.especieFavorita = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0] || 'N/D';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {}

  guardarPerfil() {
    this.api.actualizarPerfil({
      zona_habitual:    this.usuario.zona_habitual,
      tipo_pescador:    this.usuario.tipo_pescador,
      anos_experiencia: this.usuario.anos_experiencia,
      licencia_pesca:   this.usuario.licencia_pesca,
      telefono:         this.usuario.telefono,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardado     = true;
        this.errorGuardado = false;
        setTimeout(() => { this.guardado = false; this.cdr.detectChanges(); }, 3000);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorGuardado = true;
        setTimeout(() => { this.errorGuardado = false; this.cdr.detectChanges(); }, 3000);
        this.cdr.detectChanges();
      }
    });
  }

  getIniciales(): string {
    return this.usuario.nombre_completo
      .split(' ').map((n: string) => n[0] || '').join('').toUpperCase().slice(0, 2);
  }
}
