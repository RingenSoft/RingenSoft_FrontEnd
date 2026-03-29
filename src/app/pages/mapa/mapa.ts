import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
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
  mostrarCalculadora = false;
  calcRentabilidad = {
  precio_kg: 2.5,
  captura_estimada: 0,
  costo_combustible_sol: 14.5,
  costo_tripulacion: 500,
  otros_costos: 200,
  };
resultadoRentabilidad: any = null;
  cargandoRuta   = false;
  cargandoClima  = false;
  datosRuta: any = null;
  condiciones: any = null;
  alertaColor    = '#1D9E75';
  embarcaciones: any[] = [];
  embarcacionSeleccionada: any = null;
  puertos: any[]  = [];
  especies        = ['ANCHOVETA', 'BONITO', 'CABALLA', 'JUREL'];

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

  // Coordenadas de puertos para centrar el mapa
  private coordsPuertos: Record<string, [number, number]> = {
    PAITA:    [-5.09,  -81.11],
    CHICAMA:  [-7.70,  -79.45],
    CHIMBOTE: [-9.07,  -78.59],
    HUACHO:   [-11.11, -77.61],
    CALLAO:   [-12.05, -77.15],
    PISCO:    [-13.71, -76.22],
    ILO:      [-17.64, -71.34],
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

ngOnInit() {
  // Esperar al siguiente ciclo para que Angular renderice el div#mapa-leaflet
  setTimeout(() => {
    this.iniciarMapa();
    this.cargarPuertos();
    this.cargarCondicionesIniciales();
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

    // Capa base OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(this.mapa);

    // Capa náutica OpenSeaMap (puertos, boyas, profundidades)
    L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: '© OpenSeaMap',
      opacity: 0.7,
    }).addTo(this.mapa);

    this.rutaLayer      = L.layerGroup().addTo(this.mapa);
    this.fishScoreLayer = L.layerGroup().addTo(this.mapa);
  }

  cargarPuertos() {
    this.api.getPuertos().subscribe({
      next: (data) => {
        this.puertos = data.puertos;
        this.puertos.forEach(p => this.agregarMarcadorPuerto(p));
        this.cdr.detectChanges();
      }
    });
  }
cargarEmbarcaciones() {
  this.api.getEmbarcaciones().subscribe({
    next: (data: any) => {
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
  this.form.velocidad_nudos   = emb.velocidad_promedio;
  this.form.consumo_hora      = emb.consumo_hora;
  this.form.capacidad_bodega  = emb.capacidad_bodega;
  this.form.autonomia_horas   = emb.autonomia_horas;
  this.form.anio_fabricacion  = emb.anio_fabricacion;
  this.form.tripulacion       = emb.tripulacion_max;
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
  const costo_combustible = this.datosRuta?.resultado?.combustible_usado_l 
                            * this.calcRentabilidad.costo_combustible_sol || 0;
  const total_costos = costo_combustible + 
                       this.calcRentabilidad.costo_tripulacion + 
                       this.calcRentabilidad.otros_costos;
  const ganancia = ingreso - total_costos;

  this.resultadoRentabilidad = {
    ingreso_bruto:    Math.round(ingreso),
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
    this.calcRentabilidad.captura_estimada = 
      this.datosRuta.resultado.carga_estimada_tm;
  }
  this.mostrarCalculadora = true;
  this.resultadoRentabilidad = null;
  this.cdr.detectChanges();
}

  cargarCondicionesIniciales() {
    const coords = this.coordsPuertos[this.form.id_puerto] || [-9.07, -78.59];
    this.cargandoClima = true;
    this.api.getCondiciones(coords[0], coords[1], this.form.especie).subscribe({
      next: (data) => {
        this.condiciones  = data;
        this.alertaColor  = data.clima?.alerta?.color || '#1D9E75';
        this.cargandoClima = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoClima = false; }
    });
  }

  onPuertoChange() {
    const coords = this.coordsPuertos[this.form.id_puerto];
    if (coords) this.mapa.setView(coords, 7);
    this.cargarCondicionesIniciales();
  }

  calcularRuta() {
    this.cargandoRuta = true;
    this.datosRuta    = null;
    this.rutaLayer?.clearLayers();
    this.fishScoreLayer?.clearLayers();
    this.cdr.detectChanges();

    this.api.calcularRutaOptima(this.form).subscribe({
      next: (res) => {
        this.datosRuta    = res;
        this.alertaColor  = res.alerta?.color || '#1D9E75';
        this.cargandoRuta = false;
        if (res.status === 'OK') this.dibujarRuta(res.resultado.ruta);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cargandoRuta = false;
        this.cdr.detectChanges();
      }
    });
  }

  dibujarRuta(ruta: any[]) {
  if (!ruta || ruta.length < 2) return;
  if (!this.mapa) return;

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
    const color    = esPuerto ? '#1A3C6B' : this.colorPorScore(nodo.fish_score);
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

  // Centrar con verificación
  try {
    const bounds = L.latLngBounds(coordenadas);
    if (bounds.isValid()) {
      setTimeout(() => {
        this.mapa.fitBounds(bounds, { padding: [40, 40] });
      }, 100);
    }
  } catch (e) {
    console.warn('fitBounds error:', e);
  }
}

  colorPorScore(score: number): string {
    if (score >= 70) return '#1D9E75';  // verde — excelente
    if (score >= 50) return '#F59E0B';  // amarillo — bueno
    if (score >= 30) return '#E97316';  // naranja — moderado
    return '#E24B4A';                   // rojo — bajo
  }
}