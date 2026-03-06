import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json'
      })
    };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  login(datos: any)    { return this.http.post(`${this.apiUrl}/auth/login`,    datos); }
  registro(datos: any) { return this.http.post(`${this.apiUrl}/auth/registro`, datos); }

  // ── Datos públicos ────────────────────────────────────────────────────────
  getPuertos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/puertos`);
  }

  getBancos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bancos`);
  }

  getVedas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vedas`).pipe(
      catchError(() => of([]))
    );
  }

  // ── Embarcaciones ──────────────────────────────────────────────────────────
  getEmbarcaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/embarcaciones`, this.headers());
  }

  crearEmbarcacion(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/embarcaciones`, datos, this.headers());
  }

  eliminarEmbarcacion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/embarcaciones/${id}`, this.headers());
  }

  cambiarEstadoEmbarcacion(id: string, estado: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/embarcaciones/${id}/estado`,
      { estado },
      this.headers()
    );
  }

  // ── Optimización de ruta ───────────────────────────────────────────────────
  optimizarRuta(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/optimizar-ruta/`, datos, this.headers());
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getKpis(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/kpis`, this.headers());
  }

  getReportesAvanzados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/dashboard`, this.headers());
  }

  // ── Satélite Sentinel-2 / NOAA ─────────────────────────────────────────────
  getSateliteSnapshot(
    fechaInicio: string,
    fechaFin:    string,
    tipo:        string,
    zona:        string
  ): Observable<any> {
    const params = `fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&tipo=${tipo}&zona=${zona}`;
    return this.http.get<any>(
      `${this.apiUrl}/satelite/snapshot?${params}`,
      this.headers()
    );
  }

  getSateliteManchas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/satelite/manchas`, this.headers()).pipe(
      catchError(() => of({ manchas: [], total: 0 }))
    );
  }

  getPrediccion24h(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/prediccion/24h`, this.headers()).pipe(
      catchError(() => of({ predicciones: [], corrientes: [] }))
    );
  }
}