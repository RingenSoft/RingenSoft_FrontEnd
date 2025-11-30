import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'mapa.html',
  styleUrl: 'mapa.css'
})
export class MapaComponent implements OnInit {

  cargandoRuta: boolean = false;
  datosRuta: any = null;
  mapaUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Peru_location_map.svg';

  // --- [NUEVO] PEGAR ESTO AQUÍ DEBAJO ---
  transformStyle: string = 'scale(1)';
  transformOrigin: string = 'center center';
  isZoomed: boolean = false;
  // --------------------------------------

  listaBarcos: any[] = [];
  listaPuertos: any[] = [];
  barcoSeleccionadoId: string = '';

  formDatos = {
    capacidad: 0,
    combustible: 100,
    velocidad: 12,
    material: '-',
    tripulacion: 0,
    puertoSalida: 'CHIMBOTE' // Solo Salida
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarMapaBase();
    this.cargarListaBarcos();
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
      this.formDatos.capacidad = barco.capacidad_bodega;
      this.formDatos.velocidad = barco.velocidad_promedio || 12;
      this.formDatos.material = barco.material || 'ACERO';
      this.formDatos.tripulacion = barco.tripulacion || 10;
      this.formDatos.combustible = 100;
      this.cdr.detectChanges();
    }
  }

  cargarMapaBase() {
    this.api.getDatosMapa().subscribe({
      next: ({ puertos, bancos }) => {
        this.listaPuertos = puertos;
        const bancosValidos = bancos.filter((b: any) => b.x > 0 && b.y > 0);
        setTimeout(() => {
          this.dibujarNodosBase(puertos, bancosValidos);
          this.cdr.detectChanges();
        }, 100);
      },
      error: (err) => console.error("Error cargando mapa:", err)
    });
  }

  dibujarNodosBase(puertos: any[], bancos: any[]) {
    const mapArea = document.getElementById('full-map-area');
    if (!mapArea) return;
    mapArea.querySelectorAll('.nodo-punto').forEach(n => n.remove());
    const fragment = document.createDocumentFragment();

    bancos.forEach((b: any) => {
      const el = document.createElement('div');
      el.className = `nodo-punto absolute w-1.5 h-1.5 bg-red-500/60 rounded-full z-10`;
      el.style.left = b.x + '%';
      el.style.top = b.y + '%';
      fragment.appendChild(el);
    });

    puertos.forEach((p: any) => {
      const el = document.createElement('div');
      el.className = `nodo-punto absolute w-4 h-4 bg-blue-600 border-2 border-white rounded-sm shadow-lg z-20 flex items-center justify-center`;
      el.style.left = p.x + '%';
      el.style.top = p.y + '%';
      el.innerHTML = `<i class="fas fa-anchor text-[8px] text-white"></i>`;
      const label = document.createElement('div');
      label.className = `absolute -top-5 left-1/2 -translate-x-1/2 bg-white/80 px-1.5 rounded text-[9px] font-bold text-slate-700 whitespace-nowrap shadow border border-slate-200`;
      label.innerText = p.nombre;
      el.appendChild(label);
      fragment.appendChild(el);
    });

    mapArea.appendChild(fragment);
  }

  calcularRutaPersonalizada() {
    if (!this.barcoSeleccionadoId) {
      alert("Por favor selecciona una embarcación.");
      return;
    }

    this.cargandoRuta = true;
    this.datosRuta = null;
    this.resetZoom();
    this.cdr.detectChanges();

    const payload = {
      id_embarcacion: this.barcoSeleccionadoId,
      capacidad_actual: this.formDatos.capacidad,
      combustible_actual: this.formDatos.combustible,
      velocidad_personalizada: this.formDatos.velocidad,
      puerto_salida_id: this.formDatos.puertoSalida
      // Ya no enviamos puertoLlegada
    };

    this.api.optimizarRuta(payload).subscribe({
      next: (res) => {
        this.datosRuta = res;
        this.dibujarRutaEnMapa(res.secuencia_ruta);

        setTimeout(() => this.aplicarZoomARuta(res.secuencia_ruta), 100);

        this.cargandoRuta = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cargandoRuta = false;
        this.cdr.detectChanges();
        alert("Error al calcular ruta.");
      }
    });
  }

  // AQUÍ VA LA FUNCIÓN DE DIBUJO MEJORADA CON NEÓN Y FLECHAS
  dibujarRutaEnMapa(ruta: any[]) {
    const mapArea = document.getElementById('full-map-area');
    if (!mapArea) return;

    const oldSvg = mapArea.querySelector('svg');
    if (oldSvg) oldSvg.remove();

    if (!ruta || ruta.length < 2) return;

    let pathD = `M ${ruta[0].x}% ${ruta[0].y}%`;
    for (let i = 1; i < ruta.length; i++) {
      pathD += ` L ${ruta[i].x}% ${ruta[i].y}%`;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none z-30');

    svg.innerHTML = `
        <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#fbbf24" />
            </marker>
        </defs>
        <path d="${pathD}"
              stroke="#fbbf24"
              stroke-width="4"
              fill="none"
              stroke-dasharray="8,4"
              filter="url(#glow)"
              marker-end="url(#arrow)">
            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="3s" repeatCount="indefinite" />
        </path>
    `;

    ruta.forEach((p, index) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const colorFill = index === 0 ? "#2563eb" : (index === ruta.length-1 ? "#dc2626" : "white");
      const radio = index === 0 || index === ruta.length-1 ? "12" : "8";

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", p.x + "%");
      circle.setAttribute("cy", p.y + "%");
      circle.setAttribute("r", radio);
      circle.setAttribute("fill", colorFill);
      circle.setAttribute("stroke", "#fbbf24");
      circle.setAttribute("stroke-width", "2");

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", p.x + "%");
      text.setAttribute("y", p.y + "%");
      text.setAttribute("dy", ".3em");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", index === 0 || index === ruta.length-1 ? "white" : "#1e293b");
      text.setAttribute("font-size", "10");
      text.setAttribute("font-weight", "bold");
      text.textContent = (index + 1).toString();

      g.appendChild(circle);
      g.appendChild(text);
      svg.appendChild(g);
    });

    mapArea.appendChild(svg);
  }
  aplicarZoomARuta(ruta: any[]) {
    if (!ruta || ruta.length < 2) return;

    // 1. Encontrar los límites (Caja que encierra la ruta)
    let minX = 100, maxX = 0, minY = 100, maxY = 0;

    ruta.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    // 2. Calcular centro
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;

    // 3. Calcular escala (con margen para que no quede pegado)
    const scaleX = 80 / (width || 1);
    const scaleY = 80 / (height || 1);
    let scale = Math.min(scaleX, scaleY);

    if (scale > 3.5) scale = 3.5; // Máximo zoom permitido
    if (scale < 1) scale = 1;     // No alejar

    // 4. Aplicar al HTML
    this.transformOrigin = `${centerX}% ${centerY}%`;
    this.transformStyle = `scale(${scale})`;
    this.isZoomed = true;
    this.cdr.detectChanges();
  }

  resetZoom() {
    this.transformStyle = 'scale(1)';
    this.transformOrigin = 'center center';
    this.isZoomed = false;
    this.cdr.detectChanges();
  }
}
