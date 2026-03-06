import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ToastService } from '../../toast/toast.service';

@Component({
  selector:    'app-pescador',
  standalone:  true,
  imports:     [CommonModule, FormsModule, SidebarComponent],
  templateUrl: 'pescador.html',
})
export class PescadorComponent implements OnInit {

  // ── Puertos y barcos ───────────────────────────────────────────────────────
  puertos:    any[] = [];
  barcos:     any[] = [];
  cargandoDatos = true;

  // ── Formulario ─────────────────────────────────────────────────────────────
  puertoSeleccionado  = '';
  barcoSeleccionado   = '';
  horasDisponibles    = 8;

  // ── Estado ─────────────────────────────────────────────────────────────────
  cargando  = false;
  resultado: any = null;

  constructor(
    private api:   ApiService,
    private toast: ToastService,
    private cdr:   ChangeDetectorRef
  ) {}

  ngOnInit() {
    // ✅ FIX: cargar puertos Y barcos de forma independiente en OnInit,
    // no dentro de ningún *ngIf — la lista siempre estará disponible
    this.api.getPuertos().subscribe({
      next: (data: any[]) => {
        this.puertos = data;
        if (data.length > 0) this.puertoSeleccionado = data[0].id;
        this.cargandoDatos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('No se pudo cargar la lista de puertos. Verifica el backend.');
        this.cargandoDatos = false;
        this.cdr.detectChanges();
      }
    });

    this.api.getEmbarcaciones().subscribe({
      next: (data: any[]) => {
        this.barcos = data;
        if (data.length > 0) this.barcoSeleccionado = data[0].id_embarcacion;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  get formularioValido(): boolean {
    return !!this.puertoSeleccionado && this.horasDisponibles >= 1 && !!this.barcoSeleccionado;
  }

  calcular() {
    if (!this.formularioValido) {
      this.toast.warning('Selecciona puerto, embarcación y cuántas horas tienes.');
      return;
    }

    this.cargando  = true;
    this.resultado = null;
    this.cdr.detectChanges();

    // ✅ FIX: usa /optimizar-ruta (existe en backend v6) en lugar de /pescar (v7)
    // Buscamos el barco seleccionado para obtener su capacidad
    const barco = this.barcos.find(b => b.id_embarcacion === this.barcoSeleccionado);
    const cap   = barco?.capacidad_bodega || 150;
    const vel   = barco?.velocidad_promedio || 10;

    this.api.optimizarRuta({
      id_embarcacion:          this.barcoSeleccionado,
      capacidad_actual:        cap,
      combustible_actual:      100,
      velocidad_personalizada: vel,
      puerto_salida_id:        this.puertoSeleccionado,
    }).subscribe({
      next: (res) => {
        this.resultado = this._transformarRespuesta(res);
        this.cargando  = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.error?.detail || 'No se pudo calcular la ruta.';
        this.toast.error(msg);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Transforma la respuesta técnica del VRP a lenguaje de pescador.
   * No necesitamos el endpoint /pescar — transformamos aquí en el frontend.
   */
  private _transformarRespuesta(res: any): any {
    const instrucciones: string[] = [];
    const ruta = res.secuencia_ruta || [];
    const puerto = this.puertos.find(p => p.id === this.puertoSeleccionado);
    const nombrePuerto = puerto?.nombre || this.puertoSeleccionado;

    ruta.forEach((nodo: any, i: number) => {
      if (i === 0) {
        // Puerto de salida
        instrucciones.push(`⚓ Zarpas de ${nombrePuerto}`);
      } else if (nodo.tipo === 'PUERTO') {
        // Puerto de regreso
        instrucciones.push(`🏠 Regresa a ${nombrePuerto} con ${nodo.carga_acumulada} TM`);
      } else {
        // Banco de pesca
        const prev     = ruta[i - 1];
        const dist     = this._distKm(prev.latitud, prev.longitud, nodo.latitud, nodo.longitud);
        const vel      = this.barcos.find(b => b.id_embarcacion === this.barcoSeleccionado)?.velocidad_promedio || 10;
        const mins     = Math.round((dist / (vel * 1.852)) * 60);
        const cargaAqui = (nodo.carga_acumulada - (ruta[i-1]?.carga_acumulada || 0)).toFixed(0);
        instrucciones.push(`🐟 Parada ${i}: ~${Math.round(dist)} km (${mins} min) — pesca aprox. ${cargaAqui} TM`);
      }
    });

    // Advertencias automáticas
    const advertencias: string[] = [];
    if (res.tiempo_estimado_horas > this.horasDisponibles * 0.9) {
      advertencias.push(`⏰ La ruta toma ${res.tiempo_estimado_horas}h — cerca de tu límite de ${this.horasDisponibles}h.`);
    }
    if (res.carga_total_tm > 0) {
      advertencias.push(`✅ Ruta calculada con datos satelitales en tiempo real.`);
    }

    return {
      puerto_salida:   nombrePuerto,
      carga_total_tm:  res.carga_total_tm,
      horas_estimadas: res.tiempo_estimado_horas,
      distancia_km:    res.distancia_total_km,
      instrucciones,
      advertencias,
      paradas:         ruta.length - 2,  // sin contar los 2 puertos
    };
  }

  private _distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  limpiar() {
    this.resultado = null;
    this.cdr.detectChanges();
  }
}