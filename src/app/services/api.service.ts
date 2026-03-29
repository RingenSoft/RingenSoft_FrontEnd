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

  cambiarEstadoEmbarcacion(id: string, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/embarcaciones/${id}/estado`, { estado });
  }

  getReportesAvanzados(): Observable<any> {
    return this.http.get(`${this.apiUrl}/condiciones?lat=-12.05&lon=-77.15&especie=ANCHOVETA`);
  }
}
