import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTAR ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  mostrarFormulario: boolean = false;

  nuevoBarco = {
    nombre: '',
    capacidad_bodega: 300,
    velocidad_promedio: 12,
    consumo: 1.5,
    material: 'ACERO NAVAL',
    tripulacion: 10,
    anio_fabricacion: 2020
  };

  // Inyectamos ChangeDetectorRef en el constructor
  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarFlota();
  }

  cargarFlota() {
    this.cargando = true;
    // Forzamos detección al iniciar carga para asegurar que se vea el spinner
    this.cdr.detectChanges();

    this.api.getEmbarcaciones().subscribe({
      next: (data) => {
        console.log("Datos recibidos:", data); // Log para depurar
        this.embarcaciones = data;
        this.cargando = false;
        // ESTA ES LA SOLUCIÓN MÁGICA:
        // Forzamos a Angular a actualizar la vista inmediatamente
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando flota', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  registrarBarco() {
    if (!this.nuevoBarco.nombre) {
      alert("El nombre es obligatorio");
      return;
    }

    this.api.crearEmbarcacion(this.nuevoBarco).subscribe({
      next: (res) => {
        this.mensaje = `¡${res.nombre} registrado correctamente!`;
        this.mostrarFormulario = false;
        this.cargarFlota();

        this.nuevoBarco = {
          nombre: '',
          capacidad_bodega: 300,
          velocidad_promedio: 12,
          consumo: 1.5,
          material: 'ACERO NAVAL',
          tripulacion: 10,
          anio_fabricacion: 2020
        };

        this.cdr.detectChanges(); // Actualizar vista tras registro
        setTimeout(() => {
          this.mensaje = '';
          this.cdr.detectChanges(); // Actualizar vista al borrar mensaje
        }, 3000);
      },
      error: (err) => {
        console.error(err);
        alert('Error al registrar embarcación.');
      }
    });
  }

  optimizar(id: string, nombre: string) {
    this.mensaje = `Calculando ruta óptima para ${nombre}...`;
    this.cdr.detectChanges(); // Mostrar mensaje inmediatamente

    this.api.optimizarRuta({ id_embarcacion: id }).subscribe({
      next: (res) => {
        this.mensaje = `✅ Ruta generada: ${res.distancia_total_km} km (Tiempo est: ${res.tiempo_estimado_horas}h)`;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensaje = '';
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (err) => {
        console.error(err);
        this.mensaje = '❌ Error de conexión con el algoritmo.';
        this.cdr.detectChanges();
      }
    });
  }
}
