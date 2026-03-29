import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { AlertaBadgeService } from '../../services/alerta-badge.service';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './alertas.html',
})
export class AlertasComponent implements OnInit, OnDestroy {

  puertos: any[] = [];
  condicionesPorPuerto: any[] = [];
  cargando = true;
  ultimaActualizacion = '';
  private intervalo: any;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private alertaBadge: AlertaBadgeService
  ) {}

  ngOnInit() {
    this.cargarTodo();
    this.intervalo = setInterval(() => this.cargarTodo(), 60000);
  }

  ngOnDestroy() {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  cargarTodo() {
    this.api.getPuertos().subscribe({
      next: (data: any) => {
        this.puertos = data.puertos;
        this.condicionesPorPuerto = [];
        let completados = 0;
        for (const puerto of this.puertos) {
          this.api.getCondiciones(puerto.lat, puerto.lon, 'ANCHOVETA').subscribe({
            next: (cond: any) => {
              this.condicionesPorPuerto.push({ puerto, cond });
              this.condicionesPorPuerto.sort((a, b) => {
                const orden: any = { 'ROJO': 0, 'AMARILLO': 1, 'VERDE': 2 };
                return orden[a.cond.clima?.alerta?.nivel] - orden[b.cond.clima?.alerta?.nivel];
              });
              completados++;
              // Update alert badge when all ports have loaded
              if (completados === this.puertos.length) {
                this.alertaBadge.alertasRojas = this.condicionesPorPuerto
                  .filter(p => p.cond.clima?.alerta?.nivel === 'ROJO').length;
              }
              this.cargando = false;
              this.ultimaActualizacion = new Date().toLocaleTimeString('es-PE');
              this.cdr.detectChanges();
            }
          });
        }
      }
    });
  }

  getIconoAlerta(nivel: string): string {
    if (nivel === 'ROJO')     return '⛔';
    if (nivel === 'AMARILLO') return '⚠️';
    return '✅';
  }

  getBgAlerta(nivel: string): string {
    if (nivel === 'ROJO')     return 'bg-red-50 border-red-200';
    if (nivel === 'AMARILLO') return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  }

  getTextAlerta(nivel: string): string {
    if (nivel === 'ROJO')     return 'text-red-700';
    if (nivel === 'AMARILLO') return 'text-yellow-700';
    return 'text-green-700';
  }
}
