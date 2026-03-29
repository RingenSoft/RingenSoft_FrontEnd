import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {

  private permiso: NotificationPermission = 'default';

  async solicitarPermiso(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      this.permiso = 'granted';
      return true;
    }
    const result = await Notification.requestPermission();
    this.permiso = result;
    return result === 'granted';
  }

  tienePermiso(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  notificar(titulo: string, opciones?: NotificationOptions) {
    if (!this.tienePermiso()) return;
    const n = new Notification(titulo, {
      icon:  '/favicon.ico',
      badge: '/favicon.ico',
      ...opciones,
    });
    n.onclick = () => { window.focus(); n.close(); };
  }

  alertaClima(nivel: string, mensaje: string) {
    if (nivel === 'ROJO') {
      this.notificar('⛔ Alerta Roja — FishRoute Pro', {
        body: mensaje,
        tag:  'alerta-clima',
      });
    } else if (nivel === 'AMARILLO') {
      this.notificar('⚠️ Condiciones Precautorias', {
        body: mensaje,
        tag:  'alerta-clima',
      });
    }
  }

  rutaCalculada(kmTotal: number, especie: string) {
    this.notificar('✅ Ruta calculada — FishRoute Pro', {
      body: `Ruta de ${kmTotal} km optimizada para ${especie}`,
      tag:  'ruta-nueva',
    });
  }
}
