import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-planificador',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './planificador.html',
})
export class PlanificadorComponent implements OnInit {

  puertos:       any[] = [];
  embarcaciones: any[] = [];
  planes:        any[] = [];
  cargando       = false;
  mostrarForm    = false;

  form = {
    nombre_viaje:     '',
    puerto_id:        'CHIMBOTE',
    especie:          'ANCHOVETA',
    fecha_salida:     '',
    hora_salida:      '06:00',
    id_embarcacion:   '',
    combustible_pct:  0.9,
    notas:            '',
  };

  condicionesFecha: any = null;
  cargandoCondiciones   = false;
  especies = ['ANCHOVETA', 'BONITO', 'CABALLA', 'JUREL'];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    this.form.fecha_salida = manana.toISOString().split('T')[0];

    this.api.getPuertos().subscribe({
      next: (d: any) => { this.puertos = d.puertos; this.cdr.detectChanges(); }
    });
    this.api.getEmbarcaciones().subscribe({
      next: (d: any) => {
        this.embarcaciones = d;
        if (d.length > 0) this.form.id_embarcacion = d[0].id_embarcacion;
        this.cdr.detectChanges();
      }
    });

    const guardados = localStorage.getItem('planes_viaje');
    if (guardados) this.planes = JSON.parse(guardados);

    this.verificarCondiciones();
  }

  verificarCondiciones() {
    const puerto = this.puertos.find((p: any) => p.id === this.form.puerto_id);
    if (!puerto) return;
    this.cargandoCondiciones = true;
    this.api.getCondiciones(puerto.lat, puerto.lon, this.form.especie).subscribe({
      next: (d: any) => {
        this.condicionesFecha    = d;
        this.cargandoCondiciones = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoCondiciones = false; }
    });
  }

  guardarPlan() {
    if (!this.form.nombre_viaje || !this.form.fecha_salida) {
      alert('Completa nombre y fecha del viaje');
      return;
    }
    const plan = {
      id:           Date.now(),
      ...this.form,
      condiciones:  this.condicionesFecha,
      fecha_creado: new Date().toISOString(),
      estado:       'PLANIFICADO',
    };
    this.planes.unshift(plan);
    localStorage.setItem('planes_viaje', JSON.stringify(this.planes));
    this.mostrarForm = false;
    this.cdr.detectChanges();
  }

  eliminarPlan(id: number) {
    this.planes = this.planes.filter((p: any) => p.id !== id);
    localStorage.setItem('planes_viaje', JSON.stringify(this.planes));
    this.cdr.detectChanges();
  }

  cambiarEstadoPlan(plan: any, estado: string) {
    plan.estado = estado;
    localStorage.setItem('planes_viaje', JSON.stringify(this.planes));
    this.cdr.detectChanges();
  }

  getColorEstado(estado: string): string {
    if (estado === 'COMPLETADO') return 'bg-green-100 text-green-700';
    if (estado === 'CANCELADO')  return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  }

  getColorAlerta(nivel: string): string {
    if (nivel === 'ROJO')     return 'text-red-600';
    if (nivel === 'AMARILLO') return 'text-yellow-600';
    return 'text-green-600';
  }
}