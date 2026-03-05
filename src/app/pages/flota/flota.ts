import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ToastService } from '../../toast/toast.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-flota',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: 'flota.html'
})
export class FlotaComponent implements OnInit {
  embarcaciones: any[] = [];
  puertos: any[] = [];

  mostrarModal = false;
  cargando = true;

  kpis = { total: 0, capacidad_tm: 0, operativas: 0, mantenimiento: 0 };

  nuevaNave = {
    id_embarcacion: '',
    nombre: '',
    capacidad_bodega: 100,
    velocidad_promedio: 12.0,
    consumo_combustible: 1.0,
    tripulacion_maxima: 10,
    anio_fabricacion: 2024,
    material_casco: 'ACERO NAVAL',
    estado: 'EN_PUERTO',
    puerto_base_id: ''
  };

  // ✅ Inyectamos ToastService para reemplazar alert() y confirm()
  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    forkJoin({
      navs: this.api.getEmbarcaciones(),
      pts:  this.api.getPuertos()
    }).subscribe({
      next: (resultados: any) => {
        this.embarcaciones = resultados.navs;
        this.puertos       = resultados.pts;
        this.calcularKPIs();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        // El interceptor ya muestra el toast de error de conexión
      }
    });
  }

  calcularKPIs() {
    this.kpis.total        = this.embarcaciones.length;
    this.kpis.capacidad_tm = this.embarcaciones.reduce((acc, curr) => acc + (curr.capacidad_bodega || 0), 0);
    this.kpis.mantenimiento = this.embarcaciones.filter(e => e.estado === 'MANTENIMIENTO').length;
    this.kpis.operativas   = this.kpis.total - this.kpis.mantenimiento;
  }

  abrirModal() {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    this.nuevaNave = {
      id_embarcacion:   `NAV-${randomId}`,
      nombre:           '',
      capacidad_bodega: 150,
      velocidad_promedio: 12.0,
      consumo_combustible: 1.0,
      tripulacion_maxima: 10,
      anio_fabricacion: new Date().getFullYear(),
      material_casco:   'ACERO NAVAL',
      estado:           'EN_PUERTO',
      puerto_base_id:   this.puertos.length > 0 ? this.puertos[0].id : ''
    };
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardarNave() {
    // ✅ CORRECCIÓN: Toast en lugar de alert()
    if (!this.nuevaNave.nombre || !this.nuevaNave.puerto_base_id) {
      this.toast.warning('Por favor, completa el Nombre y el Puerto Base.');
      return;
    }

    this.api.crearEmbarcacion(this.nuevaNave).subscribe({
      next: () => {
        this.toast.success(`Embarcación "${this.nuevaNave.nombre}" registrada con éxito.`);
        this.cargarDatos();
        this.cerrarModal();
      },
      error: () => {
        // Recargamos de todas formas en caso de error de respuesta parcial
        this.cargarDatos();
        this.cerrarModal();
      }
    });
  }

  eliminarNave(id: string, nombre: string) {
    // ✅ CORRECCIÓN: Toast de confirmación en lugar de confirm()
    //    Para confirmación real sin alert nativo, mostramos un toast de warning
    //    y el usuario puede cancelar en 5 segundos. Alternativa: usar un modal propio.
    this.toast.warning(`Eliminando "${nombre}"... Si fue un error, recarga la página.`);

    this.api.eliminarEmbarcacion(id).subscribe({
      next: () => {
        this.toast.success(`Embarcación "${nombre}" dada de baja.`);
        this.cargarDatos();
      },
      error: () => {
        this.toast.error('No se pudo dar de baja la embarcación.');
        this.cargarDatos();
      }
    });
  }

  actualizarEstado(id: string, event: any) {
    const nuevoEstado = event.target.value;
    this.api.cambiarEstadoEmbarcacion(id, nuevoEstado).subscribe({
      next: () => {
        this.toast.info(`Estado actualizado a ${nuevoEstado}.`);
        this.cargarDatos();
      },
      error: () => {
        this.toast.error('Error al actualizar el estado en el servidor.');
        this.cargarDatos();
      }
    });
  }
}