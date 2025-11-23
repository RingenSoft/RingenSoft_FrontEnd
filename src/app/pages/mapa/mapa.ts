import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- Necesario para el formulario [(ngModel)]
import { ApiService } from '../../services/api.service';
import {SidebarComponent} from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'mapa.html',
  styleUrl: 'mapa.css'
})
export class MapaComponent implements OnInit {

  // --- Configuración del Mapa ---
  cargandoRuta: boolean = false;
  datosRuta: any = null;

  // URL ACTUALIZADA Y PROBADA (Mapa de Relieve del Perú - Proyección Equirectangular)
  // Este mapa coincide con la calibración GPS que pusimos en el backend.
  mapaUrl='assets/mapa.jpg';

  // --- Datos para el Formulario ---
  listaBarcos: any[] = [];
  barcoSeleccionadoId: string = '';

  // Modelo de datos del formulario (Valores editables por el usuario)
  formDatos = {
    capacidad: 0,    // TM
    combustible: 100, // %
    velocidad: 12    // Nudos
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Al iniciar, cargamos los puntos base (puertos/bancos) y la lista para el dropdown
    this.cargarMapaBase();
    this.cargarListaBarcos();
  }

  cargarListaBarcos() {
    this.api.getEmbarcaciones().subscribe(data => {
      this.listaBarcos = data;
    });
  }

  // Evento: Cuando el usuario selecciona un barco del dropdown
  onBarcoChange() {
    const barco = this.listaBarcos.find(b => b.id_embarcacion === this.barcoSeleccionadoId);
    if (barco) {
      // Rellenamos el formulario con los datos base de esa nave
      this.formDatos.capacidad = barco.capacidad_bodega;
      // Si la velocidad promedio viene nula, asumimos 12 nudos
      this.formDatos.velocidad = barco.velocidad_promedio || 12;
      this.formDatos.combustible = 100; // Asumimos tanque lleno por defecto
    }
  }

  cargarMapaBase() {
    this.api.getDatosMapa().subscribe({
      next: ({ puertos, bancos }) => {
        // Filtramos puntos con coordenadas inválidas (0,0) para evitar ruido en el mapa
        const bancosValidos = bancos.filter((b: any) => b.x > 0 && b.y > 0);

        // Usamos setTimeout para asegurar que el HTML del mapa ya existe antes de dibujar
        setTimeout(() => this.dibujarNodosBase(puertos, bancosValidos), 100);
      },
      error: (err) => console.error("Error cargando mapa:", err)
    });
  }

  // Dibuja los puntos estáticos (Puertos y Bancos) en el contenedor del mapa
  dibujarNodosBase(puertos: any[], bancos: any[]) {
    const mapArea = document.getElementById('full-map-area');
    if (!mapArea) return;

    // Limpiamos puntos anteriores (clase .nodo-punto) para no duplicar
    const nodosViejos = mapArea.querySelectorAll('.nodo-punto');
    nodosViejos.forEach(n => n.remove());

    const fragment = document.createDocumentFragment();

    // 1. Dibujar Bancos (Puntos rojos pequeños)
    bancos.forEach((b: any) => {
      const el = document.createElement('div');
      el.className = `nodo-punto absolute w-1.5 h-1.5 bg-red-500/60 rounded-full hover:bg-red-500 hover:scale-150 transition-transform cursor-crosshair z-10`;
      // Usamos las coordenadas X e Y calculadas por el backend (porcentajes)
      el.style.left = b.x + '%';
      el.style.top = b.y + '%';
      // Tooltip nativo simple
      el.title = `Banco #${b.id} (${b.toneladas} TM)`;
      fragment.appendChild(el);
    });

    // 2. Dibujar Puertos (Puntos azules con icono de ancla)
    puertos.forEach((p: any) => {
      const el = document.createElement('div');
      el.className = `nodo-punto absolute w-4 h-4 bg-blue-600 border-2 border-white rounded-sm shadow-lg z-20 hover:scale-125 transition-transform cursor-pointer flex items-center justify-center`;
      el.style.left = p.x + '%';
      el.style.top = p.y + '%';
      el.title = `Puerto: ${p.nombre}`;
      el.innerHTML = `<i class="fas fa-anchor text-[8px] text-white"></i>`;

      // Etiqueta con el nombre del puerto
      const label = document.createElement('div');
      label.className = `absolute -top-5 left-1/2 -translate-x-1/2 bg-white/80 px-1.5 rounded text-[9px] font-bold text-slate-700 whitespace-nowrap shadow pointer-events-none border border-slate-200`;
      label.innerText = p.nombre;
      el.appendChild(label);

      fragment.appendChild(el);
    });

    mapArea.appendChild(fragment);
  }

  // Acción del botón "Generar Ruta Óptima"
  calcularRutaPersonalizada() {
    if (!this.barcoSeleccionadoId) {
      alert("Por favor selecciona una embarcación primero.");
      return;
    }

    this.cargandoRuta = true;
    this.datosRuta = null;

    // Preparamos el objeto con los datos del formulario para enviar al backend
    const payload = {
      id_embarcacion: this.barcoSeleccionadoId,
      capacidad_actual: this.formDatos.capacidad,
      combustible_actual: this.formDatos.combustible,
      velocidad_personalizada: this.formDatos.velocidad
    };

    this.api.optimizarRuta(payload).subscribe({
      next: (res) => {
        this.datosRuta = res;
        // Dibujamos la línea verde de la ruta
        this.dibujarRutaEnMapa(res.secuencia_ruta);
        this.cargandoRuta = false;
      },
      error: (err) => {
        console.error(err);
        this.cargandoRuta = false;
        alert("Error al calcular la ruta. Verifica la conexión con el backend.");
      }
    });
  }

  // Dibuja la línea de la ruta y los puntos de parada usando SVG
  dibujarRutaEnMapa(ruta: any[]) {
    const mapArea = document.getElementById('full-map-area');
    if (!mapArea) return;

    // Borrar ruta anterior si existe
    const oldSvg = mapArea.querySelector('svg');
    if (oldSvg) oldSvg.remove();

    if (!ruta || ruta.length < 2) return;

    // Construir el "Path" SVG conectando las coordenadas X/Y de la ruta
    let pathD = `M ${ruta[0].x}% ${ruta[0].y}%`;
    for (let i = 1; i < ruta.length; i++) {
      pathD += ` L ${ruta[i].x}% ${ruta[i].y}%`;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none z-30');

    // Definir filtro de brillo (glow) para que la línea resalte
    svg.innerHTML = `
        <defs>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <path d="${pathD}" stroke="#10b981" stroke-width="2.5" fill="none" stroke-dasharray="4,2" filter="url(#glow)">
            <animate attributeName="stroke-dashoffset" from="50" to="0" dur="2s" repeatCount="indefinite" />
        </path>
    `;

    // Agregar círculos en cada parada de la ruta (Bancos visitados)
    ruta.forEach((p, index) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", p.x + "%");
      circle.setAttribute("cy", p.y + "%");

      // Inicio y fin un poco más grandes, intermedios normales
      circle.setAttribute("r", index === 0 || index === ruta.length-1 ? "3" : "2");
      // Color azul para inicio (puerto), blanco para paradas
      circle.setAttribute("fill", index === 0 ? "#2563eb" : "white");
      circle.setAttribute("stroke", "#10b981");
      svg.appendChild(circle);
    });

    mapArea.appendChild(svg);
  }
}
