import {
  Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { environment } from '../../../environments/environment';
import jsPDF from 'jspdf';

declare var google: any;

// 5 millas náuticas en grados (≈ 0.083°)
const LIMITE_5MN = 0.083;

// Polígono simplificado de la costa peruana — 44 vértices clave
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

// Waypoints marítimos seguros para doblar rutas costeras
const WP_MARITIMOS: [number, number][] = [
  [-4.0, -82.5], [-5.5, -82.0], [-7.0, -81.0], [-8.5, -80.5],
  [-9.5, -80.0], [-11.0,-79.0], [-12.5,-78.5], [-14.0,-77.5],
  [-15.5,-77.0], [-17.0,-74.0], [-18.0,-73.0],
];

@Component({
  selector:    'app-mapa',
  standalone:  true,
  imports:     [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'mapa.html',
  styleUrl:    'mapa.css'
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Estado principal ───────────────────────────────────────────────────────
  cargandoRuta   = false;
  datosRuta: any = null;
  mapaCargado    = false;
  errorRuta      = '';

  // ── Google Maps objects ────────────────────────────────────────────────────
  map:                  any;
  infoWindow:           any;
  routePolyline:        any;
  animationInterval:    any;

  // Marcadores separados por tipo para poder apagarlos selectivamente
  private _marcadoresPuertos:   any[] = [];
  private _marcadoresBancos:    any[] = [];
  private _marcadoresRuta:      any[] = [];
  private _circlesManchas:      any[] = [];
  private _markersPrediccion:   any[] = [];
  private _flechasCorriente:    any[] = [];

  // ── Listas y formulario ────────────────────────────────────────────────────
  listaBarcos:         any[] = [];
  listaPuertos:        any[] = [];
  barcoSeleccionadoId  = '';
  panelCapasAbierto    = true;

  formDatos = {
    capacidad:    0,
    combustible:  100,
    velocidad:    12,
    material:     '-',
    tripulacion:  0,
    puertoSalida: 'CHIMBOTE',
  };

  // ── Capas satelitales ──────────────────────────────────────────────────────
  capas = [
    { id: 'clorofila', nombre: 'Clorofila-a',     icono: '🌿',
      descripcion: 'NOAA MODIS · 8 días',    activa: false, opacidad: 0.7,  _layer: null as any },
    { id: 'sst',       nombre: 'Temperatura SST',  icono: '🌡️',
      descripcion: 'NOAA OISST · diaria',     activa: false, opacidad: 0.65, _layer: null as any },
    { id: 'sentinel',  nombre: 'Sentinel-2 RGB',   icono: '🛰️',
      descripcion: 'EOX cloudless 2023',      activa: false, opacidad: 0.8,  _layer: null as any },
  ];

  // ── Estadísticas de bancos ─────────────────────────────────────────────────
  statsBancos = { total: 0, favorables: 0, precaucion: 0, peligrosos: 0 };

  // ── Manchas y predicción ───────────────────────────────────────────────────
  manchas:            any[] = [];
  mostrarManchas      = false;
  cargandoManchas     = false;
  prediccion: any     = null;
  mostrarPrediccion   = false;
  cargandoPrediccion  = false;

  // ── Estilo cartográfico marino oscuro ──────────────────────────────────────
  readonly mapStyles = [
    { featureType:'water',     elementType:'geometry',         stylers:[{color:'#0d1b2e'}]},
    { featureType:'water',     elementType:'labels.text.fill', stylers:[{color:'#4a6fa5'}]},
    { featureType:'landscape', elementType:'geometry',         stylers:[{color:'#1a2744'}]},
    { featureType:'landscape.natural', elementType:'geometry', stylers:[{color:'#1e3a2f'}]},
    { featureType:'administrative', elementType:'geometry.stroke', stylers:[{color:'#2a4a6b'},{weight:0.8}]},
    { featureType:'administrative', elementType:'labels.text.fill',stylers:[{color:'#6b8fb5'}]},
    { featureType:'poi',   elementType:'labels', stylers:[{visibility:'off'}]},
    { featureType:'road',  elementType:'labels', stylers:[{visibility:'off'}]},
    { featureType:'road',  elementType:'geometry', stylers:[{visibility:'off'}]},
    { elementType:'labels.icon', stylers:[{visibility:'off'}]},
  ];

  constructor(
    private api:   ApiService,
    private cdr:   ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

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

  // ── Bootstrap Google Maps ──────────────────────────────────────────────────

  private _cargarScriptGoogleMaps() {
    if (document.getElementById('gm-script')) { this._initMapYDatos(); return; }
    const script    = document.createElement('script');
    script.id       = 'gm-script';
    // ✅ FIX: leer key desde environment.ts (no desde window.__env)
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsKey}`;
    script.onload   = () => this._initMapYDatos();
    document.head.appendChild(script);
  }

  private _initMapYDatos() {
    this._initMap();
    this.mapaCargado = true;
    this.cdr.detectChanges();
    this._cargarPuntosBase();
    // ✅ FIX: leer queryParam ?barco= para preseleccionar embarcación
    this.route.queryParams.subscribe(p => {
      if (p['barco']) {
        this.barcoSeleccionadoId = p['barco'];
        this.onBarcoChange();
      }
    });
  }

  private _initMap() {
    this.map = new google.maps.Map(document.getElementById('google-map'), {
      zoom:              6,
      center:            { lat: -9.5, lng: -81.0 },
      mapTypeId:         'roadmap',
      styles:            this.mapStyles,
      disableDefaultUI:  true,
      zoomControl:       true,
      streetViewControl: false,
      mapTypeControl:    false,
      gestureHandling:   'greedy',
    });
    this.infoWindow = new google.maps.InfoWindow({ maxWidth: 280 });
  }

  // ── Carga de datos base ────────────────────────────────────────────────────

  private _cargarPuntosBase() {
    this.api.getPuertos().subscribe({ next: (p) => this._dibujarPuertos(p), error: () => {} });
    this.api.getBancos().subscribe({  next: (b) => this._dibujarBancos(b),  error: () => {} });
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
      this.formDatos.velocidad   = b.velocidad_promedio  || 12;
      this.formDatos.material    = b.material            || b.material_casco || 'ACERO';
      this.formDatos.tripulacion = b.tripulacion         || b.tripulacion_maxima || 10;
      this.formDatos.combustible = 100;
      this.cdr.detectChanges();
    }
  }

  // ── Dibujado de puertos ────────────────────────────────────────────────────

  private _dibujarPuertos(puertos: any[]) {
    this.listaPuertos = puertos;

    puertos.forEach(p => {
      const marker = new google.maps.Marker({
        position: { lat: p.latitud, lng: p.longitud },
        map:      this.map,
        title:    p.nombre,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        6,
          fillColor:    '#38bdf8',
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
          <div style="background:#0f172a;color:#e2e8f0;padding:10px 14px;border-radius:8px;
                      font-family:sans-serif;min-width:160px;">
            <div style="color:#38bdf8;font-size:11px;font-weight:800;letter-spacing:0.1em;
                        text-transform:uppercase;margin-bottom:4px;">⚓ Puerto</div>
            <div style="font-size:15px;font-weight:900;">${p.nombre}</div>
            <div style="color:#64748b;font-size:11px;margin-top:4px;">
              ${p.latitud.toFixed(4)}°, ${p.longitud.toFixed(4)}°
            </div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });

      this._marcadoresPuertos.push(marker);
    });

    if (puertos.length > 0 && !this.formDatos.puertoSalida) {
      this.formDatos.puertoSalida = puertos[0].id;
    }
  }

  // ── Dibujado de bancos ─────────────────────────────────────────────────────

  private _dibujarBancos(bancos: any[]) {
    this._marcadoresBancos.forEach(m => m.setMap(null));
    this._marcadoresBancos = [];

    this.statsBancos = {
      total:      bancos.length,
      favorables: bancos.filter(b => b.condicion_mar === 'FAVORABLE').length,
      precaucion: bancos.filter(b => b.condicion_mar === 'PRECAUCION').length,
      peligrosos: bancos.filter(b => b.condicion_mar === 'PELIGROSO').length,
    };
    this.cdr.detectChanges();

    // ✅ RENDIMIENTO: solo FAVORABLE y PRECAUCION con biomasa > 0
    // Omitir PELIGROSO reduce ~30% los marcadores sin perder info útil de pesca
    const muestra = bancos
      .filter(b => {
        const ton  = b.toneladas || b['toneladas estimadas'] || 0;
        const cond = b.condicion_mar || 'PRECAUCION';
        return ton > 0 && cond !== 'PELIGROSO';
      })
      .slice(0, 250);

    const configMap: Record<string, { color: string; stroke: string }> = {
      'FAVORABLE':  { color: '#4ade80', stroke: '#166534' },
      'PRECAUCION': { color: '#fbbf24', stroke: '#92400e' },
      'PELIGROSO':  { color: '#64748b', stroke: '#334155' },
    };

    muestra.forEach(b => {
      const condicion  = b.condicion_mar || 'PRECAUCION';
      // ✅ RENDIMIENTO: no renderizar bancos sin biomasa real (PELIGROSO ya filtrado arriba)
      const toneladas  = b.toneladas || b['toneladas estimadas'] || 0;
      const clorofila  = b.clorofila || 0;
      const sst        = b.temperatura || 0;
      const cfg        = configMap[condicion] ?? configMap['PRECAUCION'];
      const escala     = this._escala(toneladas);

      const marker = new google.maps.Marker({
        position: { lat: b.latitud, lng: b.longitud },
        map:      this.map,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        escala,
          fillColor:    cfg.color,
          fillOpacity:  condicion === 'PELIGROSO' ? 0.25 : 0.65,
          strokeColor:  cfg.stroke,
          strokeWeight: 0.5,
        },
        zIndex: condicion === 'FAVORABLE' ? 10 : 5,
      });

      marker.addListener('mouseover', () => {
        const badge = condicion === 'FAVORABLE' ? '#4ade80'
                    : condicion === 'PRECAUCION' ? '#fbbf24' : '#64748b';
        this.infoWindow.setContent(`
          <div style="background:#0f172a;color:#e2e8f0;padding:10px 14px;border-radius:8px;
                      font-family:sans-serif;min-width:200px;border:1px solid #1e3a5f;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${badge};"></div>
              <span style="color:${badge};font-size:10px;font-weight:800;text-transform:uppercase;">
                ${condicion}
              </span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">Biomasa</div>
                <div style="font-weight:800;color:#38bdf8;">${toneladas > 0 ? toneladas.toFixed(0)+' TM' : '—'}</div>
              </div>
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">SST</div>
                <div style="font-weight:700;">${sst ? sst.toFixed(1)+'°C' : '—'}</div>
              </div>
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">Clorofila-a</div>
                <div style="font-weight:700;color:#4ade80;">${clorofila ? clorofila.toFixed(2)+' mg/m³' : '—'}</div>
              </div>
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;text-transform:uppercase;">Coords</div>
                <div style="color:#64748b;font-size:9px;">${b.latitud.toFixed(3)}, ${b.longitud.toFixed(3)}</div>
              </div>
            </div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });

      marker.addListener('mouseout', () => this.infoWindow.close());
      this._marcadoresBancos.push(marker);
    });
  }

  private _escala(toneladas: number): number {
    if (toneladas <= 0)  return 2;
    if (toneladas < 50)  return 3;
    if (toneladas < 100) return 4;
    if (toneladas < 180) return 5;
    return 6;
  }

  // ── Cálculo y dibujado de ruta ─────────────────────────────────────────────

  calcularRutaPersonalizada() {
    if (!this.barcoSeleccionadoId) return;

    this.cargandoRuta = true;
    this.datosRuta    = null;
    this.errorRuta    = '';
    this._limpiarRutaAnterior();
    this.cdr.detectChanges();

    this.api.optimizarRuta({
      id_embarcacion:          this.barcoSeleccionadoId,
      capacidad_actual:        this.formDatos.capacidad,
      combustible_actual:      this.formDatos.combustible,
      velocidad_personalizada: this.formDatos.velocidad,
      puerto_salida_id:        this.formDatos.puertoSalida,
    }).subscribe({
      next: (res) => {
        this.datosRuta    = res;
        this.cargandoRuta = false;

        // ── Corrección marítima + dibujado ──────────────────────────────────
        const rutaCorregida = this._corregirRutaMaritima(res.secuencia_ruta || []);
        this._dibujarRuta(rutaCorregida);

        // Atenuar los bancos para que la ruta sea protagonista
        this._atenuarBancos(true);

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorRuta    = err?.error?.detail || 'No se pudo calcular la ruta. Intenta con otro puerto.';
        this.cargandoRuta = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Atenúa (o restaura) los marcadores de bancos.
   * Cuando hay ruta activa los bancos bajan su opacidad para que la ruta
   * sea claramente visible sin ruido visual.
   */
  private _atenuarBancos(atenuar: boolean) {
    this._marcadoresBancos.forEach(m => {
      const icon = m.getIcon();
      if (icon) {
        m.setIcon({ ...icon, fillOpacity: atenuar ? 0.12 : 0.65 });
        m.setZIndex(atenuar ? 1 : 5);
      }
    });
  }

  // ── Corrección marítima ────────────────────────────────────────────────────

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
          latitud:         wp[0],
          longitud:        wp[1],
          id_nodo:         'WP',
          tipo:            'WAYPOINT',
          carga_acumulada: prev.carga_acumulada || 0,
          _waypoint:       true,
        });
      }
      resultado.push(curr);
    }
    return resultado;
  }

  private _necesitaWaypoint(lat1: number, lon1: number, lat2: number, lon2: number): boolean {
    for (let i = 1; i < 10; i++) {
      const t        = i / 10;
      const lat      = lat1 + t * (lat2 - lat1);
      const lon      = lon1 + t * (lon2 - lon1);
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

  // ── Dibujado de ruta ───────────────────────────────────────────────────────

  private _dibujarRuta(ruta: any[]) {
    if (!ruta || ruta.length < 2) return;

    const path:   any[] = [];
    const bounds = new google.maps.LatLngBounds();

    // Índice de parada real (sin waypoints)
    let numParada = 0;

    ruta.forEach((punto, i) => {
      const pos = { lat: punto.latitud, lng: punto.longitud };
      path.push(pos);
      bounds.extend(pos);

      // Los waypoints intermedios NO tienen marcador — solo forman la línea
      if (punto._waypoint || punto.tipo === 'WAYPOINT') return;

      const esPuerto  = punto.tipo === 'PUERTO';
      const esInicio  = numParada === 0;
      const esFin     = i === ruta.filter(p => !p._waypoint && p.tipo !== 'WAYPOINT').length - 1 + ruta.filter(p => p._waypoint || p.tipo === 'WAYPOINT').length;

      // ── Colores según posición en la ruta ────────────────────
      let fillColor: string;
      let scale: number;
      if (esPuerto) {
        fillColor = esInicio ? '#38bdf8' : '#f87171';   // azul=salida, rojo=llegada
        scale     = 11;
      } else {
        fillColor = '#fbbf24';   // amarillo dorado para bancos de pesca
        scale     = 9;
      }

      const marker = new google.maps.Marker({
        position:  pos,
        map:       this.map,
        animation: google.maps.Animation.DROP,
        zIndex:    200 + numParada,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        scale,
          fillColor:    fillColor,
          fillOpacity:  1,
          strokeColor:  '#0f172a',
          strokeWeight: 2.5,
        },
        // Número de parada solo en bancos de pesca
        label: esPuerto ? undefined : {
          text:       String(numParada),
          color:      '#0f172a',
          fontSize:   '10px',
          fontWeight: 'bold',
        },
      });

      const carga = punto.carga_acumulada || 0;
      marker.addListener('mouseover', () => {
        this.infoWindow.setContent(`
          <div style="background:#0f172a;color:#e2e8f0;padding:10px 14px;
                      border-radius:8px;font-family:sans-serif;min-width:180px;
                      border:1px solid ${esPuerto ? '#1e3a5f' : '#78350f'};">
            <div style="color:${fillColor};font-size:11px;font-weight:800;
                        text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
              ${esPuerto ? '⚓ Puerto' : `🐟 Parada ${numParada}`}
            </div>
            <div style="font-size:13px;font-weight:900;margin-bottom:4px;">
              ${punto.id_nodo}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:11px;">
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;">CARGA ACUM.</div>
                <div style="color:#4ade80;font-weight:800;">${carga.toFixed(1)} TM</div>
              </div>
              <div>
                <div style="color:#475569;font-size:9px;font-weight:700;">COORDS</div>
                <div style="color:#64748b;font-size:9px;">
                  ${punto.latitud.toFixed(3)}, ${punto.longitud.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });

      marker.addListener('mouseout', () => this.infoWindow.close());
      this._marcadoresRuta.push(marker);
      numParada++;
    });

    // ── Línea de ruta — doble trazo para efecto "brillo" ─────────────────────
    // Trazo exterior semitransparente
    const shadow = new google.maps.Polyline({
      path,
      geodesic:      true,
      strokeColor:   '#38bdf8',
      strokeOpacity: 0.20,
      strokeWeight:  8,
      zIndex:        50,
    });
    shadow.setMap(this.map);
    this._marcadoresRuta.push(shadow);

    // Trazo principal con flechas de dirección
    this.routePolyline = new google.maps.Polyline({
      path,
      geodesic:      true,
      strokeColor:   '#38bdf8',
      strokeOpacity: 0.95,
      strokeWeight:  2.5,
      icons: [{
        icon: {
          path:        google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale:       3,
          strokeColor: '#38bdf8',
          fillColor:   '#38bdf8',
          fillOpacity: 1,
        },
        offset: '20px',
        repeat: '100px',
      }],
      zIndex: 60,
    });
    this.routePolyline.setMap(this.map);

    // ── Animación de flechas moviéndose ──────────────────────────────────────
    let tick = 0;
    this.animationInterval = setInterval(() => {
      tick = (tick + 2) % 100;
      const icons = this.routePolyline.get('icons');
      icons[0].offset = tick + 'px';
      this.routePolyline.set('icons', icons);
    }, 120);

    // Ajustar cámara al bounding box de la ruta con padding
    this.map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 340 });
  }

  // ── Manchas de clorofila ───────────────────────────────────────────────────

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
        this.manchas         = res.manchas || [];
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
    this.manchas         = [];
  }

  private _dibujarManchas(manchas: any[]) {
    this._limpiarManchas();

    manchas.forEach(m => {
      // ✅ FIX: 'intensidad' viene como string 'ALTA'|'MEDIA'|'BAJA' del backend
      const intensidadStr = String(m.intensidad ?? 'BAJA');
      const intensidad = intensidadStr === 'ALTA' ? 0.9
                       : intensidadStr === 'MEDIA' ? 0.55
                       : 0.25;

      const chl     = m.clorofila_media ?? 0;
      const radioKm = m.radio_km ?? 30;

      const r     = Math.round(20  + intensidad * 200);
      const g     = Math.round(180 + intensidad * 75);
      const bVal  = Math.round(120 - intensidad * 100);
      const color = `rgb(${r},${g},${bVal})`;

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

      const label = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lon },
        map:      this.map,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        3,
          fillColor:    color,
          fillOpacity:  0.9,
          strokeWeight: 0,
        },
        label: {
          text:       `Chl ${chl.toFixed(1)}`,
          color:      color,
          fontSize:   '9px',
          fontWeight: 'bold',
        },
        zIndex: 20,
      });

      label.addListener('click', () => {
        const zonaColor = m.zona === 'Norte' ? '#fbbf24'
                        : m.zona === 'Centro' ? '#4ade80' : '#38bdf8';
        this.infoWindow.setContent(`
          <div style="background:#0a1628;color:#e2e8f0;padding:12px 16px;border-radius:10px;
                      font-family:sans-serif;min-width:230px;
                      border:1px solid ${color};box-shadow:0 0 20px ${color}33;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};
                          box-shadow:0 0 8px ${color};"></div>
              <span style="color:${zonaColor};font-size:10px;font-weight:800;
                           text-transform:uppercase;letter-spacing:0.08em;">
                🛰️ Mancha Satelital — Zona ${m.zona}
              </span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;
                        font-size:11px;margin-bottom:8px;">
              <div><span style="color:#475569">Clorofila media</span><br>
                   <b style="color:#4ade80;font-size:14px">${chl.toFixed(2)} mg/m³</b></div>
              <div><span style="color:#475569">Intensidad</span><br>
                   <b style="color:${color};font-size:14px">${intensidadStr}</b></div>
              <div><span style="color:#475569">Radio estimado</span><br>
                   <b>${radioKm.toFixed(0)} km</b></div>
              <div><span style="color:#475569">Puntos detectados</span><br>
                   <b>${m.n_puntos || '—'}</b></div>
            </div>
            <div style="background:${color}15;border:1px solid ${color}40;border-radius:6px;
                        padding:6px 8px;font-size:9px;color:#94a3b8;line-height:1.5;">
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
    const n    = Math.pow(2, zoom);
    const lonW = (coord.x / n) * 360 - 180;
    const lonE = ((coord.x + 1) / n) * 360 - 180;
    const latN = Math.atan(Math.sinh(Math.PI * (1 - 2 * coord.y / n)))         * 180 / Math.PI;
    const latS = Math.atan(Math.sinh(Math.PI * (1 - 2 * (coord.y + 1) / n)))   * 180 / Math.PI;
    return `${lonW},${latS},${lonE},${latN}`;
  }

  // ── Predicción 24h ─────────────────────────────────────────────────────────

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
        this.prediccion         = res;
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

    (data.corrientes || []).forEach((vec: any) => {
      if (Math.sqrt(vec.vel_u ** 2 + vec.vel_v ** 2) < 0.03) return;
      const flecha = new google.maps.Polyline({
        path: [
          { lat: vec.lat, lng: vec.lon },
          { lat: vec.lat + vec.vel_v * 0.8, lng: vec.lon + vec.vel_u * 0.8 },
        ],
        strokeColor:   '#22d3ee',
        strokeOpacity: 0.5,
        strokeWeight:  1.5,
        icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#22d3ee' }, offset: '100%' }],
        map:    this.map,
        zIndex: 50,
      });
      this._flechasCorriente.push(flecha);
    });

    (data.predicciones || []).forEach((pred: any) => {
      const circActual = new google.maps.Circle({
        center: { lat: pred.lat_centro, lng: pred.lon_centro },
        radius: 25_000, strokeColor: '#fbbf24', strokeOpacity: 0.7,
        strokeWeight: 1.5, fillColor: '#fbbf24', fillOpacity: 0.06,
        map: this.map, zIndex: 30,
      });
      const circPred = new google.maps.Circle({
        center: { lat: pred.lat_predicha, lng: pred.lon_predicha },
        radius: 25_000, strokeColor: '#a78bfa', strokeOpacity: 0.8,
        strokeWeight: 2, fillColor: '#a78bfa', fillOpacity: 0.12,
        map: this.map, zIndex: 30,
      });
      const linea = new google.maps.Polyline({
        path: [
          { lat: pred.lat_centro,   lng: pred.lon_centro   },
          { lat: pred.lat_predicha, lng: pred.lon_predicha },
        ],
        strokeColor: '#a78bfa', strokeOpacity: 0.6, strokeWeight: 2,
        icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: '#a78bfa' }, offset: '100%' }],
        map: this.map, zIndex: 35,
      });
      const marker = new google.maps.Marker({
        position: { lat: pred.lat_predicha, lng: pred.lon_predicha },
        map: this.map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#a78bfa', fillOpacity: 1, strokeColor: '#0f172a', strokeWeight: 2 },
        zIndex: 40,
      });
      marker.addListener('click', () => {
        this.infoWindow.setContent(`
          <div style="background:#0f172a;color:#e2e8f0;padding:10px 14px;border-radius:8px;
                      font-family:sans-serif;max-width:260px;border:1px solid #4c1d95;">
            <div style="color:#a78bfa;font-size:10px;font-weight:800;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:6px;">🔮 Predicción 24h</div>
            <div style="font-size:13px;font-weight:800;margin-bottom:4px;">${pred.zona_nombre}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:11px;">
              <div><span style="color:#64748b">Desplaz.</span><br><b>${pred.desplazamiento_km} km</b></div>
              <div><span style="color:#64748b">Confianza</span><br><b style="color:#4ade80">${pred.confianza_pct}%</b></div>
              <div><span style="color:#64748b">Clorofila</span><br><b style="color:#4ade80">${pred.clorofila_actual} mg/m³</b></div>
              <div><span style="color:#64748b">SST</span><br><b>${pred.sst_actual}°C</b></div>
            </div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });
      this._markersPrediccion.push(circActual, circPred, linea, marker);
    });
  }

  // ── Limpieza ───────────────────────────────────────────────────────────────

  limpiarMapaCompleto() {
    this._limpiarRutaAnterior();
    this.datosRuta = null;
    this.errorRuta = '';
    // Restaurar visibilidad de bancos
    this._atenuarBancos(false);
    this.map.setZoom(6);
    this.map.setCenter({ lat: -9.5, lng: -81.0 });
    this.cdr.detectChanges();
  }

  private _limpiarRutaAnterior() {
    if (this.routePolyline)     this.routePolyline.setMap(null);
    if (this.animationInterval) clearInterval(this.animationInterval);
    this._marcadoresRuta.forEach(m => m.setMap(null));
    this._marcadoresRuta = [];
  }

  // ── PDF ────────────────────────────────────────────────────────────────────

  descargarPDF() {
    if (!this.datosRuta) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Plan de Ruta — RingenSoft', 14, 20);
    doc.setFontSize(10);
    doc.text(`Distancia total:  ${this.datosRuta.distancia_total_km} km`, 14, 35);
    doc.text(`Carga total:      ${this.datosRuta.carga_total_tm} TM`,      14, 42);
    doc.text(`Tiempo estimado:  ${this.datosRuta.tiempo_estimado_horas} h`, 14, 49);
    doc.text(`Paradas: ${(this.datosRuta.secuencia_ruta?.length || 2) - 2}`, 14, 56);
    doc.save('ruta_ringensoft.pdf');
  }
}