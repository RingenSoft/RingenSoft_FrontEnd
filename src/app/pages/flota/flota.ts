import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ToastService } from '../../toast/toast.service';

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

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService   // ✅ Inyectado
  ) {}

  ngOnInit() {
    this.cargarFlota();
  }

  cargarFlota() {
    this.cargando = true;
    this.api.getEmbarcaciones().subscribe({
      next: (data) => {
        this.embarcaciones = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // El interceptor ya muestra el toast de error
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  registrarBarco() {
    if (!this.nuevoBarco.nombre.trim()) {
      this.toast.warning('El nombre de la embarcación es obligatorio.');  // ✅ Toast
      return;
    }

    this.api.crearEmbarcacion(this.nuevoBarco).subscribe({
      next: (res) => {
        this.toast.success(`¡${res.nombre} registrado correctamente!`);   // ✅ Toast
        this.mostrarFormulario = false;
        this.cargarFlota();
        this.nuevoBarco = {
          nombre: '', capacidad_bodega: 300, velocidad_promedio: 12,
          consumo: 1.5, material: 'ACERO NAVAL', tripulacion: 10, anio_fabricacion: 2020
        };
        this.cdr.detectChanges();
      },
      error: () => {
        // El interceptor maneja el toast de error
      }
    });
  }

  cambiarEstado(barco: any, event: any) {
    const nuevoEstado  = event.target.value;
    const estadoAnterior = barco.estado;
    barco.estado = nuevoEstado;

    this.api.cambiarEstadoEmbarcacion(barco.id_embarcacion, nuevoEstado).subscribe({
      next: () => {
        this.toast.success(`Estado actualizado a "${nuevoEstado}".`);     // ✅ Toast
        this.cdr.detectChanges();
      },
      error: () => {
        barco.estado = estadoAnterior;  // Revertir optimistic update
        // El interceptor maneja el toast de error
        this.cdr.detectChanges();
      }
    });
  }

  optimizar(id: string, nombre: string) {
    this.toast.info(`Calculando ruta óptima para ${nombre}...`);          // ✅ Toast
    this.api.optimizarRuta({ id_embarcacion: id, puerto_salida_id: 'CHIMBOTE' }).subscribe({
      next: (res) => {
        this.toast.success(`Ruta generada: ${res.distancia_total_km} km optimizados.`); // ✅ Toast
        this.cdr.detectChanges();
      },
      error: () => {
        // El interceptor maneja el toast de error
      }
    });
  }
}