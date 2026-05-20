import { Component, OnInit, OnDestroy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ESPECIES, colorPorScore } from '../../constants/app.constants';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'mapa.html',
})
export class MapaComponent implements OnInit, OnDestroy {

  private mapa!: L.Map;
  private rutaLayer?: L.LayerGroup;
  private fishScoreLayer?: L.LayerGroup;
  mostrarCalculadora   = false;
  mostrarComparador    = false;
  cargandoComparador   = false;
  rutasComparadas: any = null;
  rutaSeleccionadaIdx  = -1;
  mostrarAIS           = false;
  cargandoAIS          = false;
  private aisLayer?: L.LayerGroup;

  mostrarSST           = false;
  private sstLayer?: L.TileLayer.WMS;
  calcRentabilidad = {
    precio_kg:             2.5,
    captura_estimada:      0,
    costo_combustible_sol: 14.5,
    costo_tripulacion:     500,
    otros_costos:          200,
  };
  resultadoRentabilidad: any = null;
  cargandoRuta   = false;
  cargandoClima  = false;
  errorRuta      = '';
  datosRuta: any = null;
  condiciones: any = null;
  alertaColor    = '#1D9E75';
  embarcaciones: any[] = [];
  embarcacionSeleccionada: any = null;
  puertos: any[]  = [];
  private puertosCoords: Record<string, [number, number]> = {};
  readonly especies = ESPECIES;

  form = {
    id_puerto:        'CHIMBOTE',
    especie:          'ANCHOVETA',
    combustible_pct:  0.8,
    velocidad_nudos:  10,
    autonomia_horas:  24,
    consumo_hora:     20,
    capacidad_bodega: 15,
    anio_fabricacion: 2015,
    tripulacion:      6,
  };

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private notifs: NotificacionesService,
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.iniciarMapa();
      this.cargarPuertos();      // llama cargarCondicionesIniciales() al terminar
      this.cargarEmbarcaciones();
    }, 100);
  }

  ngOnDestroy() {
    if (this.mapa) this.mapa.remove();
  }

  iniciarMapa() {
    this.mapa = L.map('mapa-leaflet', {
      center: [-9.0, -78.5],
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.mapa);

    L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: '© OpenSeaMap',
      opacity: 0.8,
    }).addTo(this.mapa);

    this.rutaLayer      = L.layerGroup().addTo(this.mapa);
    this.fishScoreLayer = L.layerGroup().addTo(this.mapa);
    this.aisLayer       = L.layerGroup().addTo(this.mapa);

    // SST WMS layer (ERDDAP — NASA JPL MUR SST) — se activa con toggleSST()
    this.sstLayer = L.tileLayer.wms(
      'https://coastwatch.pfeg.noaa.gov/erddap/wms/jplMURSST41/request',
      {
        layers:      'jplMURSST41:analysed_sst',
        format:      'image/png',
        transparent: true,
        version:     '1.3.0',
        opacity:     0.55,
        attribution: 'SST: NASA JPL MUR / ERDDAP',
      } as any
    );
  }

  cargarPuertos() {
    this.api.getPuertos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.puertos = data.puertos;
        // Índice de coordenadas dinámico — no depende de la constante estática
        this.puertosCoords = {};
        for (const p of data.puertos) {
          this.puertosCoords[p.id] = [p.lat, p.lon];
        }
        this.puertos.forEach(p => this.agregarMarcadorPuerto(p));
        // Centrar el mapa en el puerto actualmente seleccionado
        const coords = this.puertosCoords[this.form.id_puerto];
        if (coords && this.mapa) this.mapa.setView(coords, 7);
        this.cargarCondicionesIniciales();
        this.cdr.detectChanges();
      }
    });
  }

  cargarEmbarcaciones() {
    this.api.getEmbarcaciones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.embarcaciones = data;
        if (data.length > 0) {
          this.seleccionarEmbarcacion(data[0]);
        }
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarEmbarcacion(emb: any) {
    this.embarcacionSeleccionada = emb;
    this.form.velocidad_nudos    = emb.velocidad_promedio;
    this.form.consumo_hora       = emb.consumo_hora;
    this.form.capacidad_bodega   = emb.capacidad_bodega;
    this.form.autonomia_horas    = emb.autonomia_horas;
    this.form.anio_fabricacion   = emb.anio_fabricacion;
    this.form.tripulacion        = emb.tripulacion_max;
    this.cdr.detectChanges();
  }

  agregarMarcadorPuerto(puerto: any) {
    const icono = L.divIcon({
      html: `<div style="background:#1A3C6B;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;white-space:nowrap;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">⚓ ${puerto.nombre}</div>`,
      className: '',
      iconAnchor: [0, 10],
    });
    L.marker([puerto.lat, puerto.lon], { icon: icono })
      .addTo(this.mapa)
      .bindPopup(`<b>⚓ ${puerto.nombre}</b><br>Puerto pesquero`);
  }

  calcularRentabilidad() {
    const ingreso = this.calcRentabilidad.precio_kg *
                    this.calcRentabilidad.captura_estimada * 1000;
    const costo_combustible = (this.datosRuta?.resultado?.combustible_usado_l ?? 0) *
                              this.calcRentabilidad.costo_combustible_sol;
    const total_costos = costo_combustible +
                         this.calcRentabilidad.costo_tripulacion +
                         this.calcRentabilidad.otros_costos;
    const ganancia = ingreso - total_costos;

    this.resultadoRentabilidad = {
      ingreso_bruto:     Math.round(ingreso),
      costo_combustible: Math.round(costo_combustible),
      costo_tripulacion: this.calcRentabilidad.costo_tripulacion,
      otros_costos:      this.calcRentabilidad.otros_costos,
      total_costos:      Math.round(total_costos),
      ganancia_neta:     Math.round(ganancia),
      rentable:          ganancia > 0,
      margen_pct:        ingreso > 0 ? Math.round((ganancia / ingreso) * 100) : 0,
    };
    this.cdr.detectChanges();
  }

  abrirCalculadora() {
    if (this.datosRuta?.resultado) {
      this.calcRentabilidad.captura_estimada = this.datosRuta.resultado.carga_estimada_tm;
    }
    this.mostrarCalculadora    = true;
    this.resultadoRentabilidad = null;
    this.cdr.detectChanges();
  }

  cargarCondicionesIniciales() {
    const coords = this.puertosCoords[this.form.id_puerto] || [-9.07, -78.59];
    this.cargandoClima = true;
    this.api.getCondiciones(coords[0], coords[1], this.form.especie)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.condiciones   = data;
          this.alertaColor   = data.clima?.alerta?.color || '#1D9E75';
          this.cargandoClima = false;
          this.cdr.detectChanges();
        },
        error: () => { this.cargandoClima = false; this.cdr.detectChanges(); }
      });
  }

  onPuertoChange() {
    const coords = this.puertosCoords[this.form.id_puerto];
    if (coords && this.mapa) this.mapa.setView(coords, 7);
    this.cargarCondicionesIniciales();
  }

  calcularRuta() {
    this.cargandoRuta = true;
    this.errorRuta    = '';
    this.datosRuta    = null;
    this.rutaLayer?.clearLayers();
    this.fishScoreLayer?.clearLayers();
    this.cdr.detectChanges();

    this.api.calcularRutaOptima(this.form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.datosRuta    = res;
          this.alertaColor  = res.alerta?.color || '#1D9E75';
          this.cargandoRuta = false;
          if (res.status === 'OK') {
            this.dibujarRuta(res.resultado.ruta);
            this.notifs.rutaCalculada(
              Math.round(res.resultado.distancia_total_km || 0),
              this.form.especie || 'ANCHOVETA'
            );
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorRuta    = err?.error?.detail || 'Error al calcular la ruta. Verifica los datos e inténtalo de nuevo.';
          this.cargandoRuta = false;
          this.cdr.detectChanges();
        }
      });
  }

  dibujarRuta(ruta: any[]) {
    if (!ruta || ruta.length < 2 || !this.mapa) return;

    this.rutaLayer?.clearLayers();

    const coordenadas: L.LatLngExpression[] = ruta.map(n => [n.lat, n.lon]);

    L.polyline(coordenadas, {
      color: '#F59E0B',
      weight: 3,
      opacity: 0.9,
      dashArray: '8, 4',
    }).addTo(this.rutaLayer!);

    ruta.forEach((nodo, i) => {
      const esPuerto = nodo.tipo === 'SALIDA' || nodo.tipo === 'RETORNO';
      const color    = esPuerto ? '#1A3C6B' : colorPorScore(nodo.fish_score);
      const icono    = L.divIcon({
        html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${i + 1}</div>`,
        className: '',
        iconAnchor: [14, 14],
      });

      const popup = esPuerto
        ? `<b>${nodo.nombre}</b>`
        : `<b>Zona ${i}</b><br>
           FishScore: <b>${nodo.fish_score}</b><br>
           Clorofila: ${nodo.clorofila ?? 'N/D'} mg/m³<br>
           Temperatura: ${nodo.temperatura_c ?? 'N/D'} °C<br>
           Carga acum.: ${nodo.carga_acumulada_tm} TM`;

      L.marker([nodo.lat, nodo.lon], { icon: icono })
        .addTo(this.rutaLayer!)
        .bindPopup(popup);
    });

    try {
      const bounds = L.latLngBounds(coordenadas);
      if (bounds.isValid()) {
        setTimeout(() => this.mapa.fitBounds(bounds, { padding: [40, 40] }), 100);
      }
    } catch (e) {
      console.warn('fitBounds error:', e);
    }
  }

  calcularRutasComparadas() {
    this.cargandoComparador  = true;
    this.rutasComparadas     = null;
    this.rutaSeleccionadaIdx = -1;
    this.cdr.detectChanges();

    this.api.calcularRutasComparadas(this.form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.cargandoComparador = false;
          if (res.status === 'BLOQUEADO') {
            this.datosRuta = res;
            this.cdr.detectChanges();
            return;
          }
          this.rutasComparadas   = res;
          this.mostrarComparador = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.cargandoComparador = false;
          this.cdr.detectChanges();
        }
      });
  }

  seleccionarRutaComparada(idx: number) {
    this.rutaSeleccionadaIdx = idx;
    const ruta = this.rutasComparadas?.rutas?.[idx];
    if (!ruta) return;
    this.datosRuta    = { status: 'OK', alerta: this.rutasComparadas.alerta, resultado: ruta };
    this.alertaColor  = this.rutasComparadas.alerta?.color || '#1D9E75';
    this.dibujarRuta(ruta.ruta);
    this.mostrarComparador = false;
    this.cdr.detectChanges();
  }

  modoCfg(modo: string): { label: string; color: string; bg: string; icon: string } {
    const map: Record<string, any> = {
      equilibrado:      { label: 'Equilibrada',        color: '#3B82F6', bg: 'bg-blue-50',   icon: '⚖️' },
      max_captura:      { label: 'Máxima captura',     color: '#10B981', bg: 'bg-green-50',  icon: '🎣' },
      min_combustible:  { label: 'Mínimo combustible', color: '#F59E0B', bg: 'bg-amber-50',  icon: '⛽' },
    };
    return map[modo] ?? { label: modo, color: '#64748B', bg: 'bg-slate-50', icon: '🧭' };
  }

  colorPorScore(score: number): string {
    return colorPorScore(score);
  }

  // ---- Exportar GPX ----
  exportarGPX() {
    const ruta = this.datosRuta?.resultado?.ruta;
    if (!ruta || ruta.length === 0) return;

    const fecha = new Date().toISOString();
    const waypoints = ruta.map((n: any, i: number) => `
  <wpt lat="${n.lat}" lon="${n.lon}">
    <name>${n.nombre ?? `Zona ${i + 1}`}</name>
    <desc>FishScore: ${n.fish_score ?? 'N/D'} | Tipo: ${n.tipo ?? ''}</desc>
  </wpt>`).join('');

    const trkpts = ruta.map((n: any) =>
      `      <trkpt lat="${n.lat}" lon="${n.lon}"><ele>0</ele></trkpt>`
    ).join('\n');

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FishRoute Pro" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Ruta FishRoute Pro — ${this.form.especie}</name>
    <time>${fecha}</time>
    <desc>Puerto: ${this.form.id_puerto} | Especie: ${this.form.especie}</desc>
  </metadata>
  ${waypoints}
  <trk>
    <name>Ruta óptima</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `fishroute-${this.form.id_puerto}-${this.form.especie}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- SST — Temperatura superficial del mar ----
  toggleSST() {
    this.mostrarSST = !this.mostrarSST;
    if (this.mostrarSST) {
      this.sstLayer?.addTo(this.mapa);
    } else {
      this.sstLayer?.remove();
    }
    this.cdr.detectChanges();
  }

  // ---- AIS — tráfico de embarcaciones cercanas ----
  toggleAIS() {
    this.mostrarAIS = !this.mostrarAIS;
    if (this.mostrarAIS) {
      this.cargarAIS();
    } else {
      this.aisLayer?.clearLayers();
    }
    this.cdr.detectChanges();
  }

  cargarAIS() {
    const coords = this.puertosCoords[this.form.id_puerto] || [-9.07, -78.59];
    this.cargandoAIS = true;
    this.api.getAisCercanos(coords[0], coords[1], 80)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.cargandoAIS = false;
          this.aisLayer?.clearLayers();
          if (!data.disponible || !data.vessels?.length) {
            this.cdr.detectChanges();
            return;
          }
          for (const v of data.vessels) {
            if (!v.lat || !v.lon) continue;
            const icono = L.divIcon({
              html: `<div style="background:#1e40af;color:white;padding:2px 5px;border-radius:3px;font-size:9px;font-weight:bold;white-space:nowrap;border:1px solid #3b82f6;">▲ ${v.nombre ?? 'AIS'}</div>`,
              className: '',
              iconAnchor: [0, 8],
            });
            L.marker([v.lat, v.lon], { icon: icono })
              .addTo(this.aisLayer!)
              .bindPopup(`<b>${v.nombre}</b><br>Vel: ${v.velocidad ?? '—'} kn<br>Rumbo: ${v.rumbo ?? '—'}°<br>${v.bandera ?? ''}`);
          }
          this.cdr.detectChanges();
        },
        error: () => { this.cargandoAIS = false; this.cdr.detectChanges(); },
      });
  }
}
