import {
  Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import jsPDF from 'jspdf';

declare var google: any;

// Límite 5 millas náuticas en grados (≈0.083°)
const LIMITE_5MN = 0.083;

// Polígono simplificado de la costa peruana para waypoints en frontend
// Mismo que costa_peru.py — 44 vértices clave
const COSTA_VERTICES: [number, number][] = [
  [-3.40,-80.48],[-3.60,-80.55],[-3.80,-80.73],[-4.00,-81.00],
  [-4.30,-81.27],[-4.60,-81.15],[-5.08,-81.11],[-5.50,-80.95],
  [-6.00,-80.82],[-6.50,-80.65],[-6.78,-79.89],[-7.15,-79.75],
  [-7.70,-79.43],[-8.10,-79.00],[-8.50,-78.75],[-9.08,-78.59],
  [-9.40,-78.25],[-9.80,-77.90],[-10.00,-77.80],[-10.45,-77.65],
  [-10.80,-77.70],[-11.02,-77.64],[-11.40,-77.35],[-11.56,-77.27],
  [-11.80,-77.15],[-12.05,-77.15],[-12.40,-76.80],[-12.80,-76.45],
  [-13.40,-76.10],[-13.70,-76.20],[-14.10,-75.70],[-14.80,-75.40],
  [-15.30,-75.10],[-15.60,-74.80],[-16.10,-73.80],[-16.40,-73.30],
  [-16.75,-72.30],[-17.00,-72.10],[-17.40,-71.60],[-17.64,-71.34],
  [-17.90,-70.98],[-18.10,-70.75],[-18.35,-70.60],
];

// Waypoints marítimos seguros para doblar rutas
const WP_MARITIMOS: [number, number][] = [
  [-4.0, -82.5], [-5.5, -82.0], [-7.0, -81.0], [-8.5, -80.5],
  [-9.5, -80.0], [-11.0, -79.0],[-12.5, -78.5],[-14.0, -77.5],
  [-15.5, -77.0],[-17.0, -74.0],[-18.0, -73.0],
];

@Component({
  selector:    'app-mapa',
  standalone:  true,
  imports:     [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'mapa.html',
  styleUrl:    'mapa.css'
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {

  cargandoRuta = false;
  datosRuta:   any = null;
  mapaCargado  = false;

  map:              any;
  markers:          any[]  = [];
  marcadoresBancos: any[]  = [];
  routePolyline:    any;
  infoWindow:       any;
  animationInterval: any;

  listaBarcos:       any[] = [];
  listaPuertos:      any[] = [];
  barcoSeleccionadoId = '';

  panelCapasAbierto = true;

  formDatos = {
    capacidad:    0,
    combustible:  100,
    velocidad:    12,
    material:     '-',
    tripulacion:  0,
    puertoSalida: 'CHIMBOTE',
  };

  // Capas satelitales
  capas = [
    { id: 'clorofila', nombre: 'Clorofila-a',    icono: '🌿',
      descripcion: 'NOAA MODIS · 8 días',   activa: false, opacidad: 0.7,  _layer: null as any },
    { id: 'sst',       nombre: 'Temperatura SST', icono: '🌡️',
      descripcion: 'NOAA OISST · diaria',    activa: false, opacidad: 0.65, _layer: null as any },
    { id: 'sentinel',  nombre: 'Sentinel-2 RGB',  icono: '🛰️',
      descripcion: 'EOX cloudless 2023',     activa: false, opacidad: 0.8,  _layer: null as any },
  ];

  // Estadísticas de bancos
  statsBancos = { total: 0, favorables: 0, precaucion: 0, peligrosos: 0 };

  // Predicción 24h
  prediccion:        any  = null;
  cargandoPrediccion = false;
  mostrarPrediccion  = false;
  _markersPrediccion: any[] = [];
  _flechasCorriente:  any[] = [];

  // Estilo cartográfico marino oscuro
  readonly mapStyles = [
    { featureType:'water',     elementType:'geometry',  stylers:[{color:'#0d1b2e'}]},
    { featureType:'water',     elementType:'labels.text.fill', stylers:[{color:'#4a6fa5'}]},
    { featureType:'landscape', elementType:'geometry',  stylers:[{color:'#1a2744'}]},
    { featureType:'landscape.natural', elementType:'geometry', stylers:[{color:'#1e3a2f'}]},
    { featureType:'administrative', elementType:'geometry.stroke', stylers:[{color:'#2a4a6b'},{weight:0.8}]},
    { featureType:'administrative', elementType:'labels.text.fill', stylers:[{color:'#6b8fb5'}]},
    { featureType:'poi',       elementType:'labels',    stylers:[{visibility:'off'}]},
    { featureType:'road',      elementType:'labels',    stylers:[{visibility:'off'}]},
    { featureType:'road',      elementType:'geometry',  stylers:[{visibility:'off'}]},
    { elementType:'labels.icon', stylers:[{visibility:'off'}]},
  ];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.cargarListaBarcos(); }

  ngAfterViewInit() {
    if (typeof google !== 'undefined' && google?.maps) {
      this._initMapYDatos();
    } else {
      this._cargarScriptGoogleMaps();
    }
  }

  ngOnDestroy() {
    if (this.animationInterval) clearInterval(this.animationInterval);
  }

  // ── Inicialización Google Maps ─────────────────────────────────────────────

  private _cargarScriptGoogleMaps() {
    if (document.getElementById('gm-script')) { this._initMapYDatos(); return; }
    const script = document.createElement('script');
    script.id  = 'gm-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this._gmKey()}`;
    script.onload = () => this._initMapYDatos();
    document.head.appendChild(script);
  }

  private _gmKey(): string {
    try { return (window as any).__env?.googleMapsKey || ''; }
    catch { return ''; }
  }

  private _initMapYDatos() {
    this._initMap();
    this.mapaCargado = true;
    this.cdr.detectChanges();
    this._cargarPuntosBase();
  }

  private _initMap() {
    this.map = new google.maps.Map(document.getElementById('google-map'), {
      zoom:             6,
      center:           { lat: -9.5, lng: -81.0 },
      mapTypeId:        'roadmap',
      styles:           this.mapStyles,
      disableDefaultUI: true,
      zoomControl:      true,
      streetViewControl:false,
      mapTypeControl:   false,
      gestureHandling:  'greedy',
    });
    this.infoWindow = new google.maps.InfoWindow({ maxWidth: 280 });
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────

  private _cargarPuntosBase() {
    this.api.getPuertos().subscribe({ next: (p) => this._dibujarPuertos(p) });
    this.api.getBancos().subscribe({  next: (b) => this._dibujarBancos(b)  });
    this.api.getVedas().subscribe({   error: () => {}                       });
  }

  cargarListaBarcos() {
    this.api.getEmbarcaciones().subscribe({
      next: (data) => { this.listaBarcos = data; this.cdr.detectChanges(); }
    });
  }

  onBarcoChange() {
    const b = this.listaBarcos.find(b => b.id_embarcacion === this.barcoSeleccionadoId);
    if (b) {
      this.formDatos.capacidad   = b.capacidad_bodega;
      this.formDatos.velocidad   = b.velocidad_promedio || 12;
      this.formDatos.material    = b.material_casco || 'ACERO';
      this.formDatos.tripulacion = b.tripulacion_maxima || 10;
      this.formDatos.combustible = 100;
      this.cdr.detectChanges();
    }
  }

  // ── Dibujado de puertos ────────────────────────────────────────────────────

  private _dibujarPuertos(puertos: any[]) {
    this.listaPuertos = puertos;

    puertos.forEach(p => {
      // Marcador: círculo pequeño + label de nombre — sin SVG grande
      const marker = new google.maps.Marker({
        position: { lat: p.latitud, lng: p.longitud },
        map:      this.map,
        title:    p.nombre,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        6,              // ← pequeño, no invasivo
          fillColor:    '#38bdf8',      // azul cielo
          fillOpacity:  1,
          strokeColor:  '#0f172a',
          strokeWeight: 2,
        },
        label: {
          text:       p.nombre,
          color:      '#e2e8f0',
          fontSize:   '10px',
          fontWeight: 'bold',
        },
        zIndex: 100,
      });

      marker.addListener('click', () => {
        this.infoWindow.setContent(`
          <div style="background:#0f172a;color:#e2e8f0;padding:10px 14px;border-radius:8px;font-family:sans-serif;min-width:160px;">
            <div style="color:#38bdf8;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">⚓ Puerto</div>
            <div style="font-size:15px;font-weight:900;">${p.nombre}</div>
            <div style="color:#64748b;font-size:11px;margin-top:4px;">${p.latitud.toFixed(4)}°, ${p.longitud.toFixed(4)}°</div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });
    });
  }

  // ── Dibujado de bancos ─────────────────────────────────────────────────────

  private _dibujarBancos(bancos: any[]) {
    // Limpiar bancos anteriores
    this.marcadoresBancos.forEach(m => m.setMap(null));
    this.marcadoresBancos = [];

    // Calcular estadísticas
    this.statsBancos = {
      total:      bancos.length,
      favorables: bancos.filter(b => b.condicion_mar === 'FAVORABLE').length,
      precaucion: bancos.filter(b => b.condicion_mar === 'PRECAUCION').length,
      peligrosos: bancos.filter(b => b.condicion_mar === 'PELIGROSO').length,
    };
    this.cdr.detectChanges();

    // Limitar a 1500 para no sobrecargar el DOM
    const muestra = bancos
      .filter(b => b.toneladas > 0 || b['toneladas estimadas'] > 0)
      .slice(0, 1500);

    muestra.forEach(b => {
      const condicion  = b.condicion_mar || 'PRECAUCION';
      const toneladas  = b.toneladas || b['toneladas estimadas'] || 0;
      const clorofila  = b.clorofila || b.clorofila_mg_m3 || 0;
      const sst        = b.temperatura || b.temperatura_mar || 0;

      // Color dinámico por condición real del banco
      const configMap: Record<string, { color: string; stroke: string; scale: number }> = {
        'FAVORABLE': { color: '#4ade80', stroke: '#166534', scale: this._escala(toneladas) },
        'PRECAUCION':{ color: '#fbbf24', stroke: '#92400e', scale: this._escala(toneladas) * 0.85 },
        'PELIGROSO': { color: '#64748b', stroke: '#334155', scale: 2.5 },
      };
      const config = configMap[condicion] ?? { color: '#64748b', stroke: '#334155', scale: 2.5 };

      const marker = new google.maps.Marker({
        position: { lat: b.latitud, lng: b.longitud },
        map:      this.map,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        config.scale,
          fillColor:    config.color,
          fillOpacity:  condicion === 'PELIGROSO' ? 0.3 : 0.75,
          strokeColor:  config.stroke,
          strokeWeight: 0.5,
        },
        zIndex: condicion === 'FAVORABLE' ? 10 : 5,
      });

      marker.addListener('mouseover', () => {
        const chlStr  = clorofila ? `${Number(clorofila).toFixed(2)} mg/m³` : '—';
        const sstStr  = sst       ? `${Number(sst).toFixed(1)}°C`           : '—';
        const tonStr  = toneladas > 0 ? `${Number(toneladas).toFixed(0)} TM` : 'Sin biomasa';
        const badgeMap: Record<string, string> = { FAVORABLE: '#4ade80', PRECAUCION: '#fbbf24', PELIGROSO: '#ef4444' };
        const badge = badgeMap[condicion] ?? '#64748b';

        this.infoWindow.setContent(`
          <div style="background:#0f172a;color:#e2e8f0;padding:10px 14px;border-radius:8px;
                      font-family:sans-serif;min-width:200px;border:1px solid #1e3a5f;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${badge};flex-shrink:0;"></div>
              <span style="color:${badge};font-size:10px;font-weight:800;text-transform:uppercase;
                           letter-spacing:0.08em;">${condicion}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">Biomasa</div>
                <div style="font-weight:800;color:#38bdf8;">${tonStr}</div>
              </div>
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">SST</div>
                <div style="font-weight:700;">${sstStr}</div>
              </div>
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">Clorofila-a</div>
                <div style="font-weight:700;color:#4ade80;">${chlStr}</div>
              </div>
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">Coords</div>
                <div style="color:#64748b;font-size:9px;">${Number(b.latitud).toFixed(3)}, ${Number(b.longitud).toFixed(3)}</div>
              </div>
            </div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });

      marker.addListener('mouseout', () => this.infoWindow.close());
      this.marcadoresBancos.push(marker);
    });
  }

  private _escala(toneladas: number): number {
    // Radio proporcional a la raíz de la biomasa — rango 3–7px
    if (toneladas <= 0)   return 2.5;
    if (toneladas < 50)   return 3.5;
    if (toneladas < 100)  return 4.5;
    if (toneladas < 180)  return 5.5;
    return 6.5;
  }

  // ── Cálculo y dibujado de rutas ────────────────────────────────────────────

  calcularRutaPersonalizada() {
    if (!this.barcoSeleccionadoId) return;

    this.cargandoRuta = true;
    this.datosRuta    = null;
    this._limpiarRutaAnterior();
    this.cdr.detectChanges();

    const payload = {
      id_embarcacion:          this.barcoSeleccionadoId,
      capacidad_actual:        this.formDatos.capacidad,
      combustible_actual:      this.formDatos.combustible,
      velocidad_personalizada: this.formDatos.velocidad,
      puerto_salida_id:        this.formDatos.puertoSalida,
    };

    this.api.optimizarRuta(payload).subscribe({
      next: (res) => {
        this.datosRuta    = res;
        this.cargandoRuta = false;
        // Aplicar corrección marítima antes de dibujar
        const rutaCorregida = this._corregirRutaMaritima(res.secuencia_ruta || []);
        this._dibujarRutaMaritima(rutaCorregida);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoRuta = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Inserta waypoints marítimos donde la ruta directa cruzaría tierra.
   * Mismo algoritmo que costa_peru.calcular_ruta_maritima() en el backend,
   * implementado en el frontend para no depender de un endpoint extra.
   */
  private _corregirRutaMaritima(ruta: any[]): any[] {
    if (ruta.length < 2) return ruta;
    const resultado: any[] = [ruta[0]];

    for (let i = 1; i < ruta.length; i++) {
      const prev = ruta[i - 1];
      const curr = ruta[i];

      if (this._necesitaWaypoint(prev.latitud, prev.longitud, curr.latitud, curr.longitud)) {
        const latMedia = (prev.latitud + curr.latitud) / 2;
        const wp = WP_MARITIMOS.reduce((a, b) =>
          Math.abs(a[0] - latMedia) < Math.abs(b[0] - latMedia) ? a : b
        );
        resultado.push({
          latitud:          wp[0],
          longitud:         wp[1],
          id_nodo:          'WP',
          tipo:             'WAYPOINT',
          carga_acumulada:  prev.carga_acumulada || 0,
          _waypoint:        true,
        });
      }
      resultado.push(curr);
    }
    return resultado;
  }

  private _necesitaWaypoint(lat1: number, lon1: number, lat2: number, lon2: number): boolean {
    for (let i = 1; i < 10; i++) {
      const t   = i / 10;
      const lat = lat1 + t * (lat2 - lat1);
      const lon = lon1 + t * (lon2 - lon1);
      const lonCosta = this._interpolarLonCosta(lat);
      if (lonCosta !== null && lon > lonCosta - LIMITE_5MN) return true;
    }
    return false;
  }

  private _interpolarLonCosta(lat: number): number | null {
    for (let i = 0; i < COSTA_VERTICES.length - 1; i++) {
      const [lat1, lon1] = COSTA_VERTICES[i];
      const [lat2, lon2] = COSTA_VERTICES[i + 1];
      if (Math.min(lat1, lat2) <= lat && lat <= Math.max(lat1, lat2)) {
        const t = (lat - lat1) / (lat2 - lat1 || 1e-6);
        return lon1 + t * (lon2 - lon1);
      }
    }
    return null;
  }

  private _dibujarRutaMaritima(ruta: any[]) {
    if (!ruta || ruta.length < 2) return;

    const path:   any[] = [];
    const bounds = new google.maps.LatLngBounds();

    ruta.forEach((punto, i) => {
      const pos = { lat: punto.latitud, lng: punto.longitud };
      path.push(pos);
      bounds.extend(pos);

      // No dibujar marcador en waypoints intermedios
      if (punto._waypoint) return;

      const esPuerto = punto.tipo === 'PUERTO';
      const esInicio = i === 0;
      const esFin    = i === ruta.filter(p => !p._waypoint).length - 1;

      const marker = new google.maps.Marker({
        position:  pos,
        map:       this.map,
        animation: google.maps.Animation.DROP,
        zIndex:    200,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        esPuerto ? 9 : 7,
          fillColor:    esInicio ? '#38bdf8' : esFin ? '#f87171' : '#fbbf24',
          fillOpacity:  1,
          strokeColor:  '#0f172a',
          strokeWeight: 2,
        },
        label: esPuerto ? undefined : {
          text:       String(ruta.filter((p, j) => !p._waypoint && j <= i).length),
          color:      '#0f172a',
          fontSize:   '9px',
          fontWeight: 'bold',
        },
      });

      marker.addListener('mouseover', () => {
        this.infoWindow.setContent(`
          <div style="background:#0f172a;color:#e2e8f0;padding:8px 12px;
                      border-radius:8px;font-family:sans-serif;font-size:12px;">
            <b style="color:${esPuerto ? '#38bdf8' : '#fbbf24'}">
              ${esPuerto ? '⚓ ' : '🐟 '}${punto.id_nodo}
            </b><br>
            <span style="color:#64748b;font-size:10px;">
              Carga acum.: ${punto.carga_acumulada || 0} TM
            </span>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
    });

    // Línea de ruta: azul marino, flechas de dirección
    this.routePolyline = new google.maps.Polyline({
      path,
      geodesic:      true,
      strokeColor:   '#38bdf8',
      strokeOpacity: 0.85,
      strokeWeight:  3,
      icons: [{
        icon:   { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: '#38bdf8' },
        offset: '100%',
        repeat: '120px',
      }],
    });
    this.routePolyline.setMap(this.map);
    this.map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });

    // Animación de flecha moviéndose
    let tick = 0;
    this.animationInterval = setInterval(() => {
      tick = (tick + 1) % 120;
      const icons = this.routePolyline.get('icons');
      icons[0].offset = tick + 'px';
      this.routePolyline.set('icons', icons);
    }, 50);
  }

  // ── Manchas de clorofila (imagen satelital negativa) ──────────────────────

  manchas:           any[] = [];
  mostrarManchas     = false;
  cargandoManchas    = false;
  _circlesManchas:   any[] = [];

  toggleManchas() {
    if (this.mostrarManchas) {
      this._limpiarManchas();
      this.mostrarManchas = false;
      return;
    }
    this.mostrarManchas  = true;
    this.cargandoManchas = true;
    this.cdr.detectChanges();

    this.api.getSateliteManchas().subscribe({
      next: (res) => {
        this.manchas        = res.manchas || [];
        this.cargandoManchas = false;
        this._dibujarManchas(this.manchas);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoManchas = false;
        this.mostrarManchas  = false;
        this.cdr.detectChanges();
      }
    });
  }

  private _limpiarManchas() {
    this._circlesManchas.forEach(c => c.setMap(null));
    this._circlesManchas = [];
    this.manchas = [];
  }

  private _dibujarManchas(manchas: any[]) {
    this._limpiarManchas();

    manchas.forEach((m, i) => {
      const intensidad = m.intensidad ?? 0.5;    // 0-1
      const chl        = m.clorofila_media ?? 0;
      const radioKm    = m.radio_km ?? 30;

      // Color basado en intensidad de clorofila:
      // Bajo Chl → teal tenue; Alto Chl → verde brillante / amarillo
      const r = Math.round(20  + intensidad * 200);
      const g = Math.round(180 + intensidad * 75);
      const b = Math.round(120 - intensidad * 100);
      const color = `rgb(${r},${g},${b})`;

      // Halo exterior — efecto "mancha luminosa en imagen negativa"
      const halo = new google.maps.Circle({
        center:        { lat: m.lat, lng: m.lon },
        radius:        radioKm * 1000 * 1.6,
        strokeColor:   color,
        strokeOpacity: 0.15,
        strokeWeight:  1,
        fillColor:     color,
        fillOpacity:   0.04 + intensidad * 0.06,
        map:           this.map,
        zIndex:        2,
      });

      // Núcleo central — más brillante
      const nucleo = new google.maps.Circle({
        center:        { lat: m.lat, lng: m.lon },
        radius:        radioKm * 1000 * 0.6,
        strokeColor:   color,
        strokeOpacity: 0.5,
        strokeWeight:  1.5,
        fillColor:     color,
        fillOpacity:   0.18 + intensidad * 0.22,
        map:           this.map,
        zIndex:        3,
      });

      // Label flotante en el centro
      const label = new google.maps.Marker({
        position:  { lat: m.lat, lng: m.lon },
        map:       this.map,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        3,
          fillColor:    color,
          fillOpacity:  0.9,
          strokeWeight: 0,
        },
        label: {
          text:      `Chl ${chl.toFixed(1)}`,
          color:     color,
          fontSize:  '9px',
          fontWeight:'bold',
        },
        zIndex: 20,
      });

      label.addListener('click', () => {
        const zonaColor = m.zona === 'Norte' ? '#fbbf24' : m.zona === 'Centro' ? '#4ade80' : '#38bdf8';
        this.infoWindow.setContent(`
          <div style="background:#0a1628;color:#e2e8f0;padding:12px 16px;border-radius:10px;
                      font-family:sans-serif;min-width:230px;
                      border:1px solid ${color};box-shadow:0 0 20px ${color}33;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;border-radius:50%;
                          background:${color};box-shadow:0 0 8px ${color};"></div>
              <span style="color:${zonaColor};font-size:10px;font-weight:800;
                           text-transform:uppercase;letter-spacing:0.08em;">
                🛰️ Mancha Satelital — Zona ${m.zona}
              </span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;margin-bottom:8px;">
              <div><span style="color:#475569">Clorofila media</span><br>
                   <b style="color:#4ade80;font-size:14px">${chl.toFixed(2)} mg/m³</b></div>
              <div><span style="color:#475569">Clorofila máx</span><br>
                   <b style="color:#a3e635;font-size:14px">${(m.clorofila_max||0).toFixed(2)} mg/m³</b></div>
              <div><span style="color:#475569">Radio estimado</span><br>
                   <b>${radioKm.toFixed(0)} km</b></div>
              <div><span style="color:#475569">Puntos detectados</span><br>
                   <b>${m.n_puntos || '—'}</b></div>
            </div>
            <div style="background:${color}15;border:1px solid ${color}40;
                        border-radius:6px;padding:6px 8px;font-size:9px;color:#94a3b8;line-height:1.5;">
              Alta concentración de fitoplancton indica zona de upwelling activo.
              Chl ≥ 0.8 mg/m³ → condición óptima para anchoveta.
              <br><span style="color:#64748b">Fuente: NOAA MODIS Aqua 8 días</span>
            </div>
          </div>
        `);
        this.infoWindow.open(this.map, label);
      });

      this._circlesManchas.push(halo, nucleo, label);
    });
  }

  // ── Capas satelitales ──────────────────────────────────────────────────────

  toggleCapa(capa: any) {
    capa.activa = !capa.activa;
    if (capa.activa) {
      this._activarCapa(capa);
    } else if (capa._layer) {
      this.map.overlayMapTypes.forEach((l: any, i: number) => {
        if (l === capa._layer) this.map.overlayMapTypes.removeAt(i);
      });
      capa._layer = null;
    }
  }

  actualizarOpacidad(capa: any) {
    if (capa._layer) capa._layer.setOpacity(capa.opacidad);
  }

  private _activarCapa(capa: any) {
    const layer = new google.maps.ImageMapType({
      getTileUrl: (coord: any, zoom: number) => this._tileUrl(capa.id, coord, zoom),
      tileSize:   new google.maps.Size(256, 256),
      opacity:    capa.opacidad,
      name:       capa.id,
    });
    capa._layer = layer;
    this.map.overlayMapTypes.push(layer);
  }

  private _tileUrl(id: string, coord: any, zoom: number): string {
    const bbox = this._tileBbox(coord, zoom);
    if (id === 'clorofila') {
      return `https://coastwatch.pfeg.noaa.gov/erddap/wms/erdMH1chla8day/request?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=erdMH1chla8day%3Achlorophyll&WIDTH=256&HEIGHT=256&CRS=CRS:84&BBOX=${bbox}&STYLES=&colorscalerange=0.01,10&logscale=true`;
    }
    if (id === 'sst') {
      return `https://coastwatch.pfeg.noaa.gov/erddap/wms/ncdcOisst21Agg_LonPM180/request?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=ncdcOisst21Agg_LonPM180%3Asst&WIDTH=256&HEIGHT=256&CRS=CRS:84&BBOX=${bbox}&STYLES=&colorscalerange=10,28`;
    }
    if (id === 'sentinel') {
      return `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/GoogleMapsCompatible/${zoom}/${coord.y}/${coord.x}.jpg`;
    }
    return '';
  }

  private _tileBbox(coord: any, zoom: number): string {
    const n   = Math.pow(2, zoom);
    const lonW = (coord.x / n) * 360 - 180;
    const lonE = ((coord.x + 1) / n) * 360 - 180;
    const latN = Math.atan(Math.sinh(Math.PI * (1 - 2 * coord.y / n))) * 180 / Math.PI;
    const latS = Math.atan(Math.sinh(Math.PI * (1 - 2 * (coord.y + 1) / n))) * 180 / Math.PI;
    return `${lonW},${latS},${lonE},${latN}`;
  }

  // ── Limpieza ───────────────────────────────────────────────────────────────

  limpiarMapaCompleto() {
    this._limpiarRutaAnterior();
    this.datosRuta = null;
    this.map.setZoom(6);
    this.map.setCenter({ lat: -9.5, lng: -81.0 });
    this.cdr.detectChanges();
  }

  private _limpiarRutaAnterior() {
    if (this.routePolyline)    this.routePolyline.setMap(null);
    if (this.animationInterval) clearInterval(this.animationInterval);
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
  }

  // ── Predicción 24h ────────────────────────────────────────────────────────

  togglePrediccion() {
    if (this.mostrarPrediccion) {
      this._limpiarPrediccion();
      this.mostrarPrediccion = false;
      return;
    }
    this.mostrarPrediccion  = true;
    this.cargandoPrediccion = true;
    this.cdr.detectChanges();

    this.api.getPrediccion24h().subscribe({
      next: (res) => {
        this.prediccion        = res;
        this.cargandoPrediccion = false;
        this._dibujarPrediccion(res);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoPrediccion = false;
        this.mostrarPrediccion  = false;
        this.cdr.detectChanges();
      }
    });
  }

  private _limpiarPrediccion() {
    this._markersPrediccion.forEach(m => m.setMap(null));
    this._flechasCorriente.forEach(f => f.setMap(null));
    this._markersPrediccion = [];
    this._flechasCorriente  = [];
  }

  private _dibujarPrediccion(data: any) {
    this._limpiarPrediccion();

    // ── Flechas de corriente (vectores) ─────────────────────────
    (data.corrientes || []).forEach((vec: any) => {
      if (Math.sqrt(vec.vel_u ** 2 + vec.vel_v ** 2) < 0.03) return; // muy débil

      const origen  = { lat: vec.lat, lng: vec.lon };
      const escala  = 0.8;  // amplificar para visibilidad
      const destino = {
        lat: vec.lat + vec.vel_v * escala,
        lng: vec.lon + vec.vel_u * escala,
      };

      const flecha = new google.maps.Polyline({
        path:          [origen, destino],
        strokeColor:   '#22d3ee',
        strokeOpacity: 0.5,
        strokeWeight:  1.5,
        icons: [{
          icon:   { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#22d3ee' },
          offset: '100%',
        }],
        map: this.map,
        zIndex: 50,
      });
      this._flechasCorriente.push(flecha);
    });

    // ── Zonas de predicción ──────────────────────────────────────
    (data.predicciones || []).forEach((pred: any) => {
      // Posición actual — círculo punteado
      const circActual = new google.maps.Circle({
        center:       { lat: pred.lat_centro, lng: pred.lon_centro },
        radius:       25_000,   // 25 km
        strokeColor:  '#fbbf24',
        strokeOpacity:0.7,
        strokeWeight: 1.5,
        fillColor:    '#fbbf24',
        fillOpacity:  0.06,
        map:          this.map,
        zIndex:       30,
      });

      // Posición predicha — círculo sólido
      const circPred = new google.maps.Circle({
        center:       { lat: pred.lat_predicha, lng: pred.lon_predicha },
        radius:       25_000,
        strokeColor:  '#a78bfa',
        strokeOpacity:0.8,
        strokeWeight: 2,
        fillColor:    '#a78bfa',
        fillOpacity:  0.12,
        map:          this.map,
        zIndex:       30,
      });

      // Línea de desplazamiento
      const linea = new google.maps.Polyline({
        path: [
          { lat: pred.lat_centro,  lng: pred.lon_centro  },
          { lat: pred.lat_predicha,lng: pred.lon_predicha},
        ],
        strokeColor:   '#a78bfa',
        strokeOpacity: 0.6,
        strokeWeight:  2,
        icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: '#a78bfa' }, offset: '100%' }],
        map:    this.map,
        zIndex: 35,
      });

      // Marker informativo en posición predicha
      const marker = new google.maps.Marker({
        position: { lat: pred.lat_predicha, lng: pred.lon_predicha },
        map:      this.map,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        7,
          fillColor:    '#a78bfa',
          fillOpacity:  1,
          strokeColor:  '#0f172a',
          strokeWeight: 2,
        },
        zIndex: 40,
      });

      marker.addListener('click', () => {
        this.infoWindow.setContent(`
          <div style="background:#0f172a;color:#e2e8f0;padding:10px 14px;border-radius:8px;
                      font-family:sans-serif;max-width:260px;border:1px solid #4c1d95;">
            <div style="color:#a78bfa;font-size:10px;font-weight:800;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:6px;">🔮 Predicción 24h</div>
            <div style="font-size:13px;font-weight:800;margin-bottom:4px;">Zona ${pred.zona_nombre}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:11px;margin-bottom:6px;">
              <div><span style="color:#64748b">Desplaz.</span><br><b>${pred.desplazamiento_km} km</b></div>
              <div><span style="color:#64748b">Confianza</span><br><b style="color:#4ade80">${pred.confianza_pct}%</b></div>
              <div><span style="color:#64748b">Clorofila</span><br><b style="color:#4ade80">${pred.clorofila_actual} mg/m³</b></div>
              <div><span style="color:#64748b">SST</span><br><b>${pred.sst_actual}°C</b></div>
            </div>
            <div style="color:#94a3b8;font-size:9px;line-height:1.4;">${pred.descripcion}</div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });

      this._markersPrediccion.push(circActual, circPred, linea, marker);
    });
  }

  descargarPDF() {
    if (!this.datosRuta) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Plan de Ruta — RingenSoft', 14, 20);
    doc.setFontSize(10);
    doc.text(`Distancia total: ${this.datosRuta.distancia_total_km} km`, 14, 35);
    doc.text(`Carga total: ${this.datosRuta.carga_total_tm} TM`, 14, 42);
    doc.text(`Tiempo estimado: ${this.datosRuta.tiempo_estimado_horas} h`, 14, 49);
    doc.save('ruta_ringensoft.pdf');
  }
}