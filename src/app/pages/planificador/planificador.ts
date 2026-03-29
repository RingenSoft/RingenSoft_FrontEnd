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
  guardando      = false;

  form = {
    nombre_viaje:    '',
    puerto_id:       'CHIMBOTE',
    especie:         'ANCHOVETA',
    fecha_salida:    '',
    hora_salida:     '06:00',
    id_embarcacion:  '',
    combustible_pct: 0.9,
    notas:           '',
  };

  condicionesFecha: any = null;
  cargandoCondiciones   = false;
  readonly especies     = ['ANCHOVETA', 'BONITO', 'CABALLA', 'JUREL'];

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

    this.cargarPlanes();
    this.verificarCondiciones();
  }

  cargarPlanes() {
    this.cargando = true;
    this.api.getPlanes().subscribe({
      next: (data: any[]) => {
        this.planes   = data.map(p => ({
          ...p,
          condiciones: p.condiciones_json ? this.tryParseJSON(p.condiciones_json) : null,
        }));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  private tryParseJSON(s: string): any {
    try { return JSON.parse(s); } catch { return null; }
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
      error: () => { this.cargandoCondiciones = false; this.cdr.detectChanges(); }
    });
  }

  guardarPlan() {
    if (!this.form.nombre_viaje || !this.form.fecha_salida) {
      alert('Completa nombre y fecha del viaje');
      return;
    }
    this.guardando = true;
    const payload = {
      ...this.form,
      condiciones_json: this.condicionesFecha ? JSON.stringify(this.condicionesFecha) : null,
    };
    this.api.crearPlan(payload).subscribe({
      next: (nuevo: any) => {
        this.planes.unshift({
          ...nuevo,
          condiciones: this.condicionesFecha,
        });
        this.mostrarForm = false;
        this.guardando   = false;
        this.cdr.detectChanges();
      },
      error: () => { this.guardando = false; alert('Error al guardar el plan.'); }
    });
  }

  eliminarPlan(id: number) {
    if (!confirm('¿Eliminar este plan de viaje?')) return;
    this.api.eliminarPlan(id).subscribe({
      next: () => {
        this.planes = this.planes.filter((p: any) => p.id !== id);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstadoPlan(plan: any, estado: string) {
    this.api.actualizarEstadoPlan(plan.id, estado).subscribe({
      next: () => {
        plan.estado = estado;
        this.cdr.detectChanges();
      }
    });
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
