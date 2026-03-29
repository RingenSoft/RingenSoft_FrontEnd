import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // AUTH
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { username, password });
  }

  registro(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/registro`, datos);
  }

  // PUERTOS
  getPuertos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/puertos`);
  }

  // CONDICIONES EN TIEMPO REAL
  getCondiciones(lat: number, lon: number, especie: string = 'ANCHOVETA'): Observable<any> {
    return this.http.get(`${this.apiUrl}/condiciones?lat=${lat}&lon=${lon}&especie=${especie}`);
  }

  getPronostico48h(lat: number, lon: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/pronostico?lat=${lat}&lon=${lon}`);
  }

  // RUTA ÓPTIMA
  calcularRutaOptima(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ruta-optima`, datos);
  }

  optimizarRuta(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ruta-optima`, datos);
  }

  calcularRutasComparadas(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas-comparadas`, datos);
  }

  // ML
  mlEntrenar(): Observable<any> {
    return this.http.post(`${this.apiUrl}/ml/entrenar`, {});
  }

  mlEstado(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ml/estado`);
  }

  // HISTORIAL
  getHistorial(): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial`);
  }

  getHistorialPendientes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial/pendientes`);
  }

  // REPORTAR CAPTURA
  reportarCaptura(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/captura/reportar`, datos);
  }

  reportarCapturaRuta(idRuta: number, capturaTm: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/historial/${idRuta}/captura?captura_tm=${capturaTm}`,
      {}
    );
  }

  // ZONAS DE CALOR
  getZonasCalor(puertoId: string, especie: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/zonas-calor?puerto_id=${puertoId}&especie=${especie}`);
  }

  // ESTADÍSTICAS
  getEstadisticas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas`);
  }

  // EMBARCACIONES
  getEmbarcaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/embarcaciones`);
  }

  crearEmbarcacion(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/embarcaciones`, datos);
  }

  actualizarEmbarcacion(id: string, datos: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/embarcaciones/${id}`, datos);
  }

  eliminarEmbarcacion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/embarcaciones/${id}`);
  }

  cambiarEstadoEmbarcacion(id: string, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/embarcaciones/${id}/estado`, { estado });
  }

  getHistorialEmbarcacion(idEmbarcacion: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial?id_embarcacion=${idEmbarcacion}`);
  }

  getReportesAvanzados(): Observable<any> {
    return this.http.get(`${this.apiUrl}/condiciones?lat=-12.05&lon=-77.15&especie=ANCHOVETA`);
  }

  // AVISTAMIENTOS
  getAvistamientos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/avistamientos`);
  }

  crearAvistamiento(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/avistamientos`, datos);
  }

  votarAvistamiento(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/avistamientos/${id}/votar`, {});
  }

  // PLANES DE VIAJE
  getPlanes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/planes`);
  }

  crearPlan(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/planes`, datos);
  }

  actualizarEstadoPlan(id: number, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/planes/${id}/estado`, { estado });
  }

  eliminarPlan(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/planes/${id}`);
  }

  // PERFIL
  getPerfil(): Observable<any> {
    return this.http.get(`${this.apiUrl}/perfil`);
  }

  actualizarPerfil(datos: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/perfil`, datos);
  }

  // MANTENIMIENTOS
  getMantenimientos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mantenimientos`);
  }

  crearMantenimiento(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mantenimientos`, datos);
  }

  eliminarMantenimiento(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/mantenimientos/${id}`);
  }

  // RANKINGS
  getRankings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rankings`);
  }

  // CHAT COMUNIDAD
  getMensajes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mensajes`);
  }

  enviarMensaje(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mensajes`, datos);
  }
}
