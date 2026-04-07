import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa-calor',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './mapa-calor.html',
})
export class MapaCalorComponent implements OnInit, OnDestroy {

  private mapa!: L.Map;
  private capaZonas?: L.LayerGroup;

  puertos:   any[] = [];
  zonas:     any[] = [];
  cargando   = false;
  cargandoMapa = true;

  filtro = {
    puerto_id: 'CHIMBOTE',
    especie:   'ANCHOVETA',
  };
  especies = ['ANCHOVETA', 'BONITO', 'CABALLA', 'JUREL'];

  estadisticas = {
    total: 0,
    promedio: 0,
    maximo: 0,
    zona_caliente: null as any,
  };

  private filtroChange$ = new Subject<void>();
  private filtroSub?: Subscription;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getPuertos().subscribe({
      next: (d: any) => {
        this.puertos = d.puertos;
        this.cdr.detectChanges();
      }
    });

    // Debounce para evitar múltiples requests cuando el usuario cambia filtros rápido
    this.filtroSub = this.filtroChange$.pipe(
      debounceTime(400),
      switchMap(() => {
        this.cargando = true;
        this.capaZonas?.clearLayers();
        this.cdr.detectChanges();
        return this.api.getZonasCalor(this.filtro.puerto_id, this.filtro.especie);
      })
    ).subscribe({
      next: (data: any) => {
        this.zonas    = data.zonas || [];
        this.cargando = false;
        this.calcularEstadisticas();
        this.dibujarZonas(data.puerto);
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });

    setTimeout(() => {
      this.iniciarMapa();
      this.cargarZonas();
    }, 100);
  }

  ngOnDestroy() {
    if (this.mapa) this.mapa.remove();
    this.filtroSub?.unsubscribe();
  }

  iniciarMapa() {
    this.mapa = L.map('mapa-calor-leaflet', {
      center: [-9.0, -79.0],
      zoom: 6,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.mapa);

    L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      opacity: 0.7,
    }).addTo(this.mapa);

    this.capaZonas = L.layerGroup().addTo(this.mapa);
    this.cargandoMapa = false;
  }

  // Llamado desde la UI al cambiar filtros — pasa por debounce
  aplicarFiltros() {
    this.filtroChange$.next();
  }

  // Carga inicial (sin debounce)
  cargarZonas() {
    this.cargando = true;
    this.capaZonas?.clearLayers();
    this.cdr.detectChanges();

    this.api.getZonasCalor(this.filtro.puerto_id, this.filtro.especie).subscribe({
      next: (data: any) => {
        this.zonas    = data.zonas || [];
        this.cargando = false;
        this.calcularEstadisticas();
        this.dibujarZonas(data.puerto);
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  dibujarZonas(puerto: any) {
    if (!this.capaZonas || !this.mapa) return;
    this.capaZonas.clearLayers();

    // Marcador del puerto
    const iconoPuerto = L.divIcon({
      html: `<div style="background:#1A3C6B;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">⚓ ${puerto.nombre}</div>`,
      className: '',
    });
    L.marker([puerto.lat, puerto.lon], { icon: iconoPuerto })
      .addTo(this.capaZonas)
      .bindPopup(`<b>⚓ ${puerto.nombre}</b>`);

    // Círculos de calor por zona
    this.zonas.forEach(zona => {
      const color  = this.colorPorScore(zona.fish_score);
      const radio  = 20000 + zona.fish_score * 800; // radio proporcional al score

      L.circle([zona.lat, zona.lon], {
        radius:      radio,
        color:       color,
        fillColor:   color,
        fillOpacity: 0.25,
        weight:      1.5,
        opacity:     0.7,
      }).addTo(this.capaZonas!)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:160px">
            <p style="font-weight:bold;margin-bottom:6px">🐟 Zona de Pesca</p>
            <p>FishScore: <b>${zona.fish_score}</b>/100</p>
            <p>Clorofila: <b>${zona.clorofila ?? 'N/D'}</b> mg/m³</p>
            <p>Temperatura: <b>${zona.temperatura ?? 'N/D'}</b>°C</p>
            <p style="font-size:10px;color:#888;margin-top:4px">${zona.nivel_chla}</p>
          </div>
        `);

      // Etiqueta con score
      const icono = L.divIcon({
        html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${zona.fish_score}</div>`,
        className: '',
        iconAnchor: [16, 16],
      });
      L.marker([zona.lat, zona.lon], { icon: icono })
        .addTo(this.capaZonas!);
    });

    // Centrar mapa siempre en el puerto, ajustar bounds si hay zonas
    if (this.zonas.length > 0) {
      const coords: L.LatLngExpression[] = this.zonas.map(z => [z.lat, z.lon]);
      coords.push([puerto.lat, puerto.lon]);
      try {
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          setTimeout(() => this.mapa.fitBounds(bounds, { padding: [60, 60] }), 100);
        }
      } catch(e) {
        setTimeout(() => this.mapa.setView([puerto.lat, puerto.lon], 7), 100);
      }
    } else {
      setTimeout(() => this.mapa.setView([puerto.lat, puerto.lon], 7), 100);
    }
  }

  calcularEstadisticas() {
    if (!this.zonas.length) return;
    const scores = this.zonas.map(z => z.fish_score);
    this.estadisticas = {
      total:        this.zonas.length,
      promedio:     Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      maximo:       Math.max(...scores),
      zona_caliente: this.zonas.reduce((a, b) => a.fish_score > b.fish_score ? a : b),
    };
  }

  colorPorScore(score: number): string {
    if (score >= 70) return '#1D9E75';
    if (score >= 50) return '#639922';
    if (score >= 35) return '#F59E0B';
    if (score >= 20) return '#E97316';
    return '#E24B4A';
  }
}