import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }

  getKpis(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/kpis`);
  }

  getEmbarcaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/embarcaciones`, this.getHeaders());
  }

  getDatosMapa(): Observable<any> {
    return forkJoin({
      puertos: this.http.get<any[]>(`${this.apiUrl}/puertos`),
      bancos: this.http.get<any[]>(`${this.apiUrl}/bancos`)
    });
  }

  crearEmbarcacion(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/embarcaciones`, datos, this.getHeaders());
  }

  optimizarRuta(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/optimizar-ruta/`, datos);
  }

  // NUEVO: Obtener Reportes Completos
  getReportesAvanzados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/dashboard`, this.getHeaders());
  }

  cambiarEstadoEmbarcacion(id: string, nuevoEstado: string): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/embarcaciones/${id}/estado`,
      { estado: nuevoEstado },
      this.getHeaders()
    );
  }
}
