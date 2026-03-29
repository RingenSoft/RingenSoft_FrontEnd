import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: 'rankings.html',
})
export class RankingsComponent implements OnInit {

  ranking:  any[] = [];
  cargando  = true;

  readonly MEDALLAS = ['🥇', '🥈', '🥉'];
  readonly LOGROS: { id: string; nombre: string; desc: string; icono: string; req: (u: any, idx?: number) => boolean }[] = [
    { id: 'primer_pez',   nombre: 'Primer Pez',       desc: 'Registra tu primera captura',       icono: '🐟', req: u => u.total_rutas >= 1 },
    { id: 'veterano',     nombre: 'Veterano del Mar',  desc: 'Completa 10 salidas',               icono: '⚓', req: u => u.total_rutas >= 10 },
    { id: 'gran_captura', nombre: 'Gran Captura',      desc: 'Supera 5 TM en una sola salida',    icono: '🏆', req: u => u.mejor_captura >= 5 },
    { id: 'navegante',    nombre: 'Gran Navegante',    desc: 'Navega más de 1,000 km en total',   icono: '🧭', req: u => u.total_km >= 1000 },
    { id: 'lider',        nombre: 'Líder de Flota',    desc: 'Sé el #1 en captura total',         icono: '👑', req: (_u, idx = 0) => idx === 0 },
    { id: 'constante',    nombre: 'Pescador Constante',desc: 'Completa 5 salidas o más',          icono: '🌊', req: u => u.total_rutas >= 5 },
  ];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getRankings().subscribe({
      next: (data: any) => {
        this.ranking = data.ranking || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  getLogros(usuario: any, idx: number): { icono: string; nombre: string }[] {
    return this.LOGROS.filter(l => {
      try { return l.req(usuario, idx); } catch { return false; }
    });
  }

  getInitials(nombre: string): string {
    return nombre.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2);
  }
}
