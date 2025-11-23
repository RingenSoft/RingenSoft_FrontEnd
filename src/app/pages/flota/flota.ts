import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- Necesario para el formulario [(ngModel)]
import { ApiService } from '../../services/api.service';
import {SidebarComponent} from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-flota',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: 'flota.html',
  styleUrl: 'flota.css'
})
export class FlotaComponent implements OnInit {
  embarcaciones: any[] = [];
  cargando: boolean = true;
  mensaje: string = '';

  // Control de visibilidad del Modal
  mostrarFormulario: boolean = false;

  // Modelo de datos para la nueva embarcación
  // Inicializado con valores por defecto para evitar 'null' o 'undefined'
  nuevoBarco = {
    nombre: '',
    capacidad_bodega: 300,
    velocidad_promedio: 12,
    consumo: 1.5,
    material: 'ACERO NAVAL', // Valor por defecto del select
    tripulacion: 10,
    anio_fabricacion: 2020
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarFlota();
  }

  // 1. Cargar lista de barcos desde el backend
  cargarFlota() {
    this.cargando = true;
    this.api.getEmbarcaciones().subscribe({
      next: (data) => {
        this.embarcaciones = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando flota', err);
        this.cargando = false;
      }
    });
  }

  // 2. Registrar nueva embarcación (Acción del Modal)
  registrarBarco() {
    // Validación simple
    if (!this.nuevoBarco.nombre) {
      alert("El nombre es obligatorio");
      return;
    }

    // Llamada al servicio API
    this.api.crearEmbarcacion(this.nuevoBarco).subscribe({
      next: (res) => {
        // Éxito: Mostrar mensaje y cerrar modal
        this.mensaje = `¡${res.nombre} registrado correctamente!`;
        this.mostrarFormulario = false;

        // Recargar la tabla para que aparezca el nuevo barco
        this.cargarFlota();

        // Resetear el formulario a valores limpios/por defecto
        this.nuevoBarco = {
          nombre: '',
          capacidad_bodega: 300,
          velocidad_promedio: 12,
          consumo: 1.5,
          material: 'ACERO NAVAL',
          tripulacion: 10,
          anio_fabricacion: 2020
        };

        // Quitar el mensaje después de 3 segundos
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: (err) => {
        console.error(err);
        alert('Error al registrar embarcación. Verifica que el backend esté corriendo.');
      }
    });
  }

  // 3. Optimizar ruta para un barco existente
  optimizar(id: string, nombre: string) {
    this.mensaje = `Calculando ruta óptima para ${nombre}...`;

    // Llamada rápida al algoritmo (simulando click desde la tabla)
    this.api.optimizarRuta({ id_embarcacion: id }).subscribe({
      next: (res) => {
        this.mensaje = `✅ Ruta generada: ${res.distancia_total_km} km (Tiempo est: ${res.tiempo_estimado_horas}h)`;
        setTimeout(() => this.mensaje = '', 5000);
      },
      error: (err) => {
        console.error(err);
        this.mensaje = '❌ Error de conexión con el algoritmo.';
      }
    });
  }
}
