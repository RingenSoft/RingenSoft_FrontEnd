import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import {SidebarComponent} from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.css'
})
export class DashboardComponent implements OnInit {

  // Datos dinámicos
  kpis: any = {
    flota_activa: 'Cargando...',
    operatividad: '--%',
    pesca_dia: '--',
    ahorro: '--',
    alertas: 0
  };

  listaEmbarcaciones: any[] = [];

  // Mapa
  mapaUrl = 'assets/mapa_peru.jpg'; // La misma imagen local que en MapaComponent

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    // 1. Traer KPIs
    this.api.getKpis().subscribe(data => {
      this.kpis = data;
    });

    // 2. Traer Flota (Para la lista lateral)
    this.api.getEmbarcaciones().subscribe(data => {
      // Tomamos solo los primeros 5 para no saturar el dashboard
      this.listaEmbarcaciones = data.slice(0, 5);
    });

    // 3. Traer Puntos del Mapa y Dibujar
    this.api.getDatosMapa().subscribe(({ puertos, bancos }) => {
      const bancosValidos = bancos.filter((b: any) => b.x > 0 && b.y > 0);
      // Usamos timeout para asegurar que el HTML del mapa existe
      setTimeout(() => this.dibujarMapaMiniatura(puertos, bancosValidos), 100);
    });
  }

  dibujarMapaMiniatura(puertos: any[], bancos: any[]) {
    const mapArea = document.getElementById('dashboard-map-area');
    if (!mapArea) return;

    mapArea.innerHTML = ''; // Limpiar

    const fragment = document.createDocumentFragment();

    // Dibujar Bancos (Puntos rojos pequeños)
    // Solo dibujamos una muestra aleatoria (ej. 50) para que el mapa pequeño se vea limpio
    const muestraBancos = bancos.sort(() => 0.5 - Math.random()).slice(0, 50);

    muestraBancos.forEach((b: any) => {
      const el = document.createElement('div');
      el.className = `absolute w-1 h-1 bg-red-500/60 rounded-full z-10`;
      el.style.left = b.x + '%';
      el.style.top = b.y + '%';
      fragment.appendChild(el);
    });

    // Dibujar Puertos (Puntos azules)
    puertos.forEach((p: any) => {
      const el = document.createElement('div');
      el.className = `absolute w-2 h-2 bg-blue-600 border border-white rounded-sm shadow z-20`;
      el.style.left = p.x + '%';
      el.style.top = p.y + '%';
      el.title = p.nombre;
      fragment.appendChild(el);
    });

    mapArea.appendChild(fragment);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
