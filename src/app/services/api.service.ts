import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private apiUrl = 'http://127.0.0.1:8000/api/v2';

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

  // RUTA ÓPTIMA
  calcularRutaOptima(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ruta-optima`, datos);
  }

  optimizarRuta(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ruta-optima`, datos);
  }

  // HISTORIAL
  getHistorial(): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial`);
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
}
