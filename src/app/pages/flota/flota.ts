import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

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

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarFlota();
  }

  cargarFlota() {
    this.cargando = true;
    this.cdr.detectChanges();

    this.api.getEmbarcaciones().subscribe({
      next: (data) => {
        this.embarcaciones = data;
        this.cargando = false;
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
        this.nuevoBarco = { nombre: '', capacidad_bodega: 300, velocidad_promedio: 12, consumo: 1.5, material: 'ACERO NAVAL', tripulacion: 10, anio_fabricacion: 2020 };
        this.cdr.detectChanges();
        setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => alert('Error al registrar embarcación.')
    });
  }

  // --- NUEVA LÓGICA DE ESTADO (SELECTOR) ---
  cambiarEstado(barco: any, event: any) {
    const nuevoEstado = event.target.value;
    const estadoAnterior = barco.estado;

    // Actualización visual optimista
    barco.estado = nuevoEstado;

    this.api.cambiarEstadoEmbarcacion(barco.id_embarcacion, nuevoEstado).subscribe({
      next: (res) => {
        console.log("Estado actualizado:", res);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        barco.estado = estadoAnterior; // Revertir si falla
        alert("Error al cambiar estado.");
        this.cdr.detectChanges();
      }
    });
  }

  optimizar(id: string, nombre: string) {
    this.mensaje = `Calculando ruta óptima para ${nombre}...`;
    this.cdr.detectChanges();
    // Parametros minimos requeridos por el backend
    this.api.optimizarRuta({ id_embarcacion: id, puerto_salida_id: 'CHIMBOTE' }).subscribe({
      next: (res) => {
        this.mensaje = `✅ Ruta generada: ${res.distancia_total_km} km`;
        this.cdr.detectChanges();
        setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 5000);
      },
      error: (err) => {
        this.mensaje = '❌ Error de conexión.';
        this.cdr.detectChanges();
      }
    });
  }
}
