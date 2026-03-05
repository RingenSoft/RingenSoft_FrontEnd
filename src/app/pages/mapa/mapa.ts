import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ToastService } from '../../toast/toast.service';
import { environment } from '../../../environments/environment';
import jsPDF from 'jspdf';

declare var google: any;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'mapa.html',
  styleUrl: 'mapa.css'
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {

  cargandoRuta = false;
  datosRuta: any = null;

  map: any;
  markers: any[] = [];
  routePolyline: any;
  infoWindow: any;
  animationInterval: any;

  listaBarcos: any[] = [];
  listaPuertos: any[] = [];
  barcoSeleccionadoId = '';

  formDatos = {
    capacidad: 0,
    combustible: 100,
    velocidad: 12,
    material: '-',
    tripulacion: 0,
    puertoSalida: 'CHIMBOTE'
  };

  mapStyles = [
    { featureType: "water",              elementType: "geometry",    stylers: [{ color: "#a2daf2" }] },
    { featureType: "landscape.man_made", elementType: "geometry",    stylers: [{ color: "#f7f1df" }] },
    { featureType: "landscape.natural",  elementType: "geometry",    stylers: [{ color: "#d0e3b4" }] },
    { featureType: "poi",                elementType: "labels",      stylers: [{ visibility: "off" }] },
    { featureType: "road",               elementType: "labels",      stylers: [{ visibility: "off" }] },
    { elementType: "labels.icon",                                    stylers: [{ visibility: "off" }] }
  ];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService  // ✅ Inyectado
  ) {}

  ngOnInit() {
    this.cargarListaBarcos();
  }

  ngAfterViewInit() {
    // ✅ Carga Google Maps dinámicamente con key desde environment
    this.cargarGoogleMapsScript().then(() => {
      this.initMap();
      this.cargarPuntosBase();
    });
  }

  ngOnDestroy() {
    if (this.animationInterval) clearInterval(this.animationInterval);
  }

  // ✅ NUEVO: carga el script de Google Maps solo una vez, con key del environment
  private cargarGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsKey}&libraries=visualization`;
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  initMap() {
    this.map = new google.maps.Map(document.getElementById('google-map'), {
      zoom: 6,
      center: { lat: -9.19, lng: -75.01 },
      mapTypeId: 'roadmap',
      styles: this.mapStyles,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false
    });
    this.infoWindow = new google.maps.InfoWindow({ maxWidth: 250 });
  }

  cargarPuntosBase() {
    this.api.getDatosMapa().subscribe({
      next: ({ puertos, bancos }) => {
        this.listaPuertos = puertos;
        const anchorPath = "M12,2C12,1.45 11.55,1 11,1C10.45,1 10,1.45 10,2V4C6.9,4.4 4.4,6.9 4,10H2V12H4V15H2V17H4.2C5,20.8 8.2,23.8 12,23.8C15.8,23.8 19,20.8 19.8,17H22V15H20V12H22V10H20C19.6,6.9 17.1,4.4 14,4V2C14,1.45 13.55,1 13,1C12.45,1 12,1.45 12,2M12,19C9.8,19 8,17.2 8,15V10C8,7.8 9.8,6 12,6C14.2,6 16,7.8 16,10V15C16,17.2 14.2,19 12,19Z";

        puertos.forEach((p: any) => {
          new google.maps.Marker({
            position: { lat: p.latitud, lng: p.longitud },
            map: this.map,
            title: p.nombre,
            icon: {
              path: anchorPath, fillColor: "#1e40af", fillOpacity: 1,
              strokeWeight: 1, strokeColor: "#ffffff", scale: 1.2,
              anchor: new google.maps.Point(12, 12),
              labelOrigin: new google.maps.Point(12, -10)
            },
            label: { text: p.nombre, color: "#0f172a", fontSize: "11px", fontWeight: "bold" },
            zIndex: 100
          });
        });

        // 1. Array matemático para el Heatmap de Google
        const datosTermicos: any[] = [];

        bancos.forEach((b: any) => {
          // Asignamos el peso térmico. Si el agua es muy fría/ideal, tendrá más "peso" visual
          let peso = 0;
          if (b.temperatura <= 19.0) peso = 10; // Fuerte intensidad para aguas de pesca
          else peso = 2; // Baja intensidad para aguas cálidas sin pesca

          datosTermicos.push({
            location: new google.maps.LatLng(b.latitud, b.longitud),
            weight: peso
          });

          // 2. Solo dibujamos los Cardúmenes reales (puntos de anclaje de biomasa)
          if (b.toneladas > 0) {
              const markerPez = new google.maps.Marker({
                position: { lat: b.latitud, lng: b.longitud },
                map: this.map,
                icon: { 
                  path: google.maps.SymbolPath.CIRCLE, scale: 5, 
                  fillColor: "#ef4444", fillOpacity: 1, strokeWeight: 1, strokeColor: "#ffffff"
                },
                zIndex: 20
              });

              markerPez.addListener("mouseover", () => {
                this.infoWindow.setContent(`
                  <div style="padding:8px;font-family:sans-serif;">
                    <h4 style="margin:0 0 5px;color:#10b981;font-weight:bold;">📍 Cardumen Activo</h4>
                    <div style="font-size:12px;color:#475569;">
                      <b>🐟 Biomasa:</b> ${b.toneladas} TM<br>
                      <b>🌡️ SST Real:</b> ${b.temperatura} °C<br>
                      <div style="font-size:10px;color:#94a3b8;margin-top:3px;">🛰️ Datos: Open-Meteo Satellite</div>
                    </div>
                  </div>`);
                this.infoWindow.open(this.map, markerPez);
              });
              markerPez.addListener("mouseout", () => this.infoWindow.close());
          }
        });

        // 3. INYECTAR LA CAPA TÉRMICA REAL (HEATMAP)
        const heatmap = new google.maps.visualization.HeatmapLayer({
          data: datosTermicos,
          map: this.map,
          radius: 60, // Radio de difuminado para crear una mancha fluida
          opacity: 0.5,
          gradient: [
            "rgba(0, 255, 255, 0)",      // Transparente
            "rgba(0, 255, 255, 1)",      // Cyan (Agua muy fría)
            "rgba(0, 191, 255, 1)",      // Celeste
            "rgba(16, 185, 129, 1)",     // Verde (Agua Óptima)
            "rgba(255, 165, 0, 1)",      // Naranja (Cálido)
            "rgba(239, 68, 68, 1)"       // Rojo (Demasiado cálido)
          ]
        });
      }
    }
      );
  }

  cargarListaBarcos() {
    this.api.getEmbarcaciones().subscribe({
      next: (data) => {
        this.listaBarcos = data;
        this.cdr.detectChanges();
      }
    });
  }

  onBarcoChange() {
    const barco = this.listaBarcos.find(b => b.id_embarcacion === this.barcoSeleccionadoId);
    if (barco) {
      this.formDatos.capacidad   = barco.capacidad_bodega;
      this.formDatos.velocidad   = barco.velocidad_promedio || 12;
      this.formDatos.material    = barco.material || 'ACERO';
      this.formDatos.tripulacion = barco.tripulacion || 10;
      this.formDatos.combustible = 100;
      this.cdr.detectChanges();
    }
  }

  calcularRutaPersonalizada() {
    if (!this.barcoSeleccionadoId) {
      this.toast.warning('Por favor selecciona una embarcación.');
      return;
    }
    this.cargandoRuta = true;
    this.datosRuta = null;
    this.limpiarRutaAnterior();
    this.cdr.detectChanges();

    const payload = {
      id_embarcacion:       this.barcoSeleccionadoId,
      capacidad_actual:     this.formDatos.capacidad,
      combustible_actual:   this.formDatos.combustible,
      velocidad_personalizada: this.formDatos.velocidad,
      puerto_salida_id:     this.formDatos.puertoSalida
    };

    this.api.optimizarRuta(payload).subscribe({
      next: (res) => {
        this.datosRuta = res;
        this.dibujarRutaGoogle(res.secuencia_ruta);
        this.cargandoRuta = false;
        this.toast.success(`Ruta optimizada: ${res.distancia_total_km} km con ${res.secuencia_ruta.length} puntos.`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoRuta = false;
        this.cdr.detectChanges();
      }
    });
  }

  limpiarMapaCompleto() {
    this.limpiarRutaAnterior();
    this.datosRuta = null;
    this.map.setZoom(6);
    this.map.setCenter({ lat: -9.19, lng: -75.01 });
    this.cdr.detectChanges();
  }

  limpiarRutaAnterior() {
    if (this.routePolyline) this.routePolyline.setMap(null);
    if (this.animationInterval) clearInterval(this.animationInterval);
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
  }

  dibujarRutaGoogle(ruta: any[]) {
    if (!ruta || ruta.length < 2) return;
    const pathCoords: any[] = [];
    const bounds = new google.maps.LatLngBounds();

    ruta.forEach((punto, index) => {
      const pos = { lat: punto.latitud, lng: punto.longitud };
      pathCoords.push(pos);
      bounds.extend(pos);

      const marker = new google.maps.Marker({
        position: pos, map: this.map,
        label: { text: (index + 1).toString(), color: "white", fontSize: "10px", fontWeight: "bold" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: index === 0 || index === ruta.length - 1 ? 12 : 8,
          fillColor: index === 0 ? "#2563eb" : index === ruta.length - 1 ? "#dc2626" : "#f59e0b",
          fillOpacity: 1, strokeColor: "white", strokeWeight: 2
        },
        animation: google.maps.Animation.DROP,
        zIndex: 200
      });
      marker.addListener("mouseover", () => {
        this.infoWindow.setContent(`
          <div style="text-align:center;padding:5px;">
            <b>Punto ${index + 1}</b><br>
            <span style="color:#666;font-size:12px;">Carga: ${punto.carga_acumulada} TM</span>
          </div>`);
        this.infoWindow.open(this.map, marker);
      });
      this.markers.push(marker);
    });

    this.routePolyline = new google.maps.Polyline({
      path: pathCoords, geodesic: true,
      strokeColor: "#f59e0b", strokeOpacity: 0.8, strokeWeight: 5,
      icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: "#f59e0b" }, offset: '100%', repeat: '200px' }]
    });
    this.routePolyline.setMap(this.map);
    this.map.fitBounds(bounds);

    let count = 0;
    this.animationInterval = setInterval(() => {
      count = (count + 1) % 200;
      const icons = this.routePolyline.get('icons');
      if (icons) { icons[0].offset = count / 2 + '%'; this.routePolyline.set('icons', icons); }
    }, 20);
  }

  descargarPDF() {
    if (!this.datosRuta) return;
    const doc = new jsPDF();
    const ruta = this.datosRuta;
    const fecha = new Date().toLocaleDateString('es-PE');

    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text("Ringensoft - Reporte de Ruta VRP", 105, 20, { align: "center" });
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 25, 190, 25);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Fecha de Emisión: ${fecha}`, 20, 35);
    doc.text(`ID Embarcación: ${ruta.id_embarcacion}`, 20, 42);

    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175);
    doc.text("Métricas de Eficiencia", 20, 55);

    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    let y = 65;
    ruta.resumen_texto.split('\n').forEach((linea: string) => {
      doc.text(linea, 20, y);
      y += 6;
    });

    y += 8;
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175);
    doc.text("Secuencia de Navegación", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(30, 64, 175);
    doc.rect(20, y, 170, 8, 'F');
    doc.text("Orden", 25, y + 5);
    doc.text("Punto", 50, y + 5);
    doc.text("Tipo", 120, y + 5);
    doc.text("Carga Acum.", 160, y + 5);
    y += 10;

    doc.setTextColor(0, 0, 0);
    ruta.secuencia_ruta.forEach((punto: any, index: number) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text((index + 1).toString(), 25, y);
      doc.text(punto.id_nodo, 50, y);
      doc.text(punto.tipo, 120, y);
      doc.text(`${punto.carga_acumulada} TM`, 160, y);
      doc.setDrawColor(230, 230, 230);
      doc.line(20, y + 2, 190, y + 2);
      y += 8;
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generado por Ringensoft — Motor de Optimización Google OR-Tools", 105, 290, { align: "center" });
    doc.save(`Ruta_${ruta.id_embarcacion}_${fecha.replace(/\//g, '-')}.pdf`);
  }
}