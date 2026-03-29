import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './perfil.html',
})
export class PerfilComponent implements OnInit {

  usuario = {
    nombre_completo: '',
    username:        '',
    zona_habitual:   'CHIMBOTE',
    tipo_pescador:   'ARTESANAL',
    anos_experiencia: 5,
    licencia_pesca:  '',
    telefono:        '',
  };

  historial: any[]   = [];
  totalRutas         = 0;
  totalKm            = 0;
  totalCargaTm       = 0;
  especieFavorita    = '';
  guardado           = false;
  puertos: any[]     = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const nombre   = localStorage.getItem('usuario') || '';
    const username = localStorage.getItem('username') || '';
    this.usuario.nombre_completo = nombre;
    this.usuario.username        = username;

    const perfilGuardado = localStorage.getItem('perfil_extra');
    if (perfilGuardado) {
      const extra = JSON.parse(perfilGuardado);
      this.usuario = { ...this.usuario, ...extra };
    }

    this.api.getPuertos().subscribe({
      next: (d: any) => { this.puertos = d.puertos; this.cdr.detectChanges(); }
    });

    this.api.getHistorial().subscribe({
      next: (data: any) => {
        this.historial     = data.rutas || [];
        this.totalRutas    = this.historial.length;
        this.totalKm       = Math.round(this.historial.reduce((s: number, r: any) => s + (r.distancia_km || 0), 0));
        this.totalCargaTm  = Math.round(this.historial.reduce((s: number, r: any) => s + (r.carga_estimada || 0), 0) * 10) / 10;
        const conteo: any  = {};
        this.historial.forEach((r: any) => { conteo[r.especie] = (conteo[r.especie] || 0) + 1; });
        this.especieFavorita = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0] || 'N/D';
        this.cdr.detectChanges();
      }
    });
  }

  guardarPerfil() {
    localStorage.setItem('perfil_extra', JSON.stringify({
      zona_habitual:    this.usuario.zona_habitual,
      tipo_pescador:    this.usuario.tipo_pescador,
      anos_experiencia: this.usuario.anos_experiencia,
      licencia_pesca:   this.usuario.licencia_pesca,
      telefono:         this.usuario.telefono,
    }));
    this.guardado = true;
    setTimeout(() => { this.guardado = false; this.cdr.detectChanges(); }, 3000);
    this.cdr.detectChanges();
  }

  getIniciales(): string {
    return this.usuario.nombre_completo
      .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}