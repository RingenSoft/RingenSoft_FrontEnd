import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

// --- Interfaces de respuesta ---

export interface Puerto {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

export interface Embarcacion {
  id_embarcacion: string;
  nombre: string;
  capacidad_bodega: number;
  velocidad_promedio: number;
  consumo_hora: number;
  autonomia_horas: number;
  material_casco: string;
  tripulacion_max: number;
  anio_fabricacion: number;
  estado: string;
  puerto_base_id: string | null;
}

export interface RutaHistorial {
  id: number;
  fecha: string | null;
  distancia_km: number | null;
  carga_estimada: number | null;
  captura_real: number | null;
  especie: string | null;
  condicion_olas: number | null;
  temp_mar: number | null;
  id_embarcacion: string | null;
  fish_score: number | null;
  tiempo_horas: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  nombre: string;
  rol: string;
  id_usuario: number;
  zona_habitual: string | null;
}

export interface RutaOptimaRequest {
  id_puerto: string;
  especie?: string;
  combustible_pct?: number;
  velocidad_nudos?: number | null;
  autonomia_horas?: number | null;
  consumo_hora?: number | null;
  capacidad_bodega?: number | null;
  anio_fabricacion?: number | null;
  tripulacion?: number | null;
  top_zonas?: number;
  id_embarcacion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {

  private apiUrl = environment.apiUrl;

  // Cache de requests estáticos — se comparte entre todos los componentes
  private puertos$:      Observable<{ puertos: Puerto[] }> | null = null;
  private embarcaciones$: Observable<Embarcacion[]> | null = null;

  constructor(private http: HttpClient) {}

  /** Limpia el caché (útil tras login/logout) */
  limpiarCache(): void {
    this.puertos$ = null;
    this.embarcaciones$ = null;
  }

  // AUTH
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password });
  }

  registro(datos: { username: string; password: string; nombre_completo: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/registro`, datos);
  }

  // PUERTOS — cacheado: la lista no cambia en sesión
  getPuertos(): Observable<{ puertos: Puerto[] }> {
    if (!this.puertos$) {
      this.puertos$ = this.http.get<{ puertos: Puerto[] }>(`${this.apiUrl}/puertos`)
        .pipe(shareReplay(1));
    }
    return this.puertos$;
  }

  // CONDICIONES EN TIEMPO REAL
  getCondiciones(lat: number, lon: number, especie: string = 'ANCHOVETA'): Observable<any> {
    return this.http.get(`${this.apiUrl}/condiciones?lat=${lat}&lon=${lon}&especie=${especie}`);
  }

  getPronostico48h(lat: number, lon: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/pronostico?lat=${lat}&lon=${lon}`);
  }

  // RUTA ÓPTIMA
  calcularRutaOptima(datos: RutaOptimaRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/ruta-optima`, datos);
  }

  calcularRutasComparadas(datos: RutaOptimaRequest): Observable<any> {
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
  getHistorial(): Observable<{ usuario: string; total: number; rutas: RutaHistorial[] }> {
    return this.http.get<{ usuario: string; total: number; rutas: RutaHistorial[] }>(`${this.apiUrl}/historial`);
  }

  getHistorialPendientes(): Observable<{ total: number; rutas: RutaHistorial[] }> {
    return this.http.get<{ total: number; rutas: RutaHistorial[] }>(`${this.apiUrl}/historial/pendientes`);
  }

  getHistorialEmbarcacion(idEmbarcacion: string): Observable<{ usuario: string; total: number; rutas: RutaHistorial[] }> {
    return this.http.get<{ usuario: string; total: number; rutas: RutaHistorial[] }>(
      `${this.apiUrl}/historial?id_embarcacion=${idEmbarcacion}`
    );
  }

  // REPORTAR CAPTURA
  reportarCaptura(datos: { id_embarcacion: string; captura_real_tm: number; especie: string }): Observable<any> {
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

  // EMBARCACIONES — cacheado, se invalida tras mutaciones
  getEmbarcaciones(): Observable<Embarcacion[]> {
    if (!this.embarcaciones$) {
      this.embarcaciones$ = this.http.get<Embarcacion[]>(`${this.apiUrl}/embarcaciones`)
        .pipe(shareReplay(1));
    }
    return this.embarcaciones$;
  }

  crearEmbarcacion(datos: Partial<Embarcacion>): Observable<{ id_embarcacion: string; nombre: string }> {
    this.embarcaciones$ = null; // invalida cache
    return this.http.post<{ id_embarcacion: string; nombre: string }>(`${this.apiUrl}/embarcaciones`, datos);
  }

  actualizarEmbarcacion(id: string, datos: Partial<Embarcacion>): Observable<any> {
    this.embarcaciones$ = null; // invalida cache
    return this.http.patch(`${this.apiUrl}/embarcaciones/${id}`, datos);
  }

  eliminarEmbarcacion(id: string): Observable<any> {
    this.embarcaciones$ = null; // invalida cache
    return this.http.delete(`${this.apiUrl}/embarcaciones/${id}`);
  }

  cambiarEstadoEmbarcacion(id: string, estado: string): Observable<any> {
    this.embarcaciones$ = null; // invalida cache
    return this.http.patch(`${this.apiUrl}/embarcaciones/${id}/estado`, { estado });
  }

  // AVISTAMIENTOS
  getAvistamientos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/avistamientos`);
  }

  crearAvistamiento(datos: { especie: string; zona: string; descripcion: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/avistamientos`, datos);
  }

  votarAvistamiento(id: number): Observable<{ id: number; votos: number }> {
    return this.http.patch<{ id: number; votos: number }>(`${this.apiUrl}/avistamientos/${id}/votar`, {});
  }

  // PLANES DE VIAJE
  getPlanes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/planes`);
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
  getMantenimientos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mantenimientos`);
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
  getMensajes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mensajes`);
  }

  enviarMensaje(datos: { texto: string; tipo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/mensajes`, datos);
  }

  // AVISTAMIENTO CON FOTO (multipart/form-data)
  crearAvistamientoConFoto(datos: { especie: string; zona: string; descripcion: string }, foto?: File): Observable<any> {
    const fd = new FormData();
    fd.append('especie',     datos.especie);
    fd.append('zona',        datos.zona);
    fd.append('descripcion', datos.descripcion);
    if (foto) fd.append('foto', foto, foto.name);
    return this.http.post(`${this.apiUrl}/avistamientos/con-foto`, fd);
  }

  // MAREAS
  getMareas(lat: number, lon: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/mareas?lat=${lat}&lon=${lon}`);
  }

  // VEDAS
  getVedas(especie: string, fecha?: string): Observable<any> {
    let url = `${this.apiUrl}/vedas?especie=${especie}`;
    if (fecha) url += `&fecha=${fecha}`;
    return this.http.get(url);
  }

  // FISHSCORE TENDENCIA
  getFishScoreTendencia(especie: string, limite = 20): Observable<any> {
    return this.http.get(`${this.apiUrl}/fishscore/tendencia?especie=${especie}&limite=${limite}`);
  }

  // AIS — TRÁFICO DE EMBARCACIONES
  getAisCercanos(lat: number, lon: number, radio = 50): Observable<any> {
    return this.http.get(`${this.apiUrl}/ais/cercanos?lat=${lat}&lon=${lon}&radio=${radio}`);
  }

  // FLOTA MULTI-EMBARCACION
  optimizarFlota(datos: { id_puerto: string; especie: string; combustible_pct: number; id_embarcaciones: string[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/flota/optimizar`, datos);
  }

  // SOS
  enviarSOS(datos: { lat: number; lon: number; mensaje?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/sos`, datos);
  }

  // BITÁCORA DE CAPTURAS
  getBitacora(pagina = 1, limite = 20, especie?: string): Observable<any> {
    let url = `${this.apiUrl}/bitacora?pagina=${pagina}&limite=${limite}`;
    if (especie) url += `&especie=${especie}`;
    return this.http.get(url);
  }

  crearEntradaBitacora(datos: {
    id_embarcacion?: string;
    especie: string;
    kilos: number;
    lat?: number;
    lon?: number;
    zona_nombre?: string;
    precio_kg?: number;
    condicion_mar?: string;
    notas?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/bitacora`, datos);
  }

  getBitacoraResumen(): Observable<any> {
    return this.http.get(`${this.apiUrl}/bitacora/resumen`);
  }

  // AVISTAMIENTOS PAGINADOS
  getAvistamientosFeed(pagina = 1, limite = 20, especie?: string): Observable<any> {
    let url = `${this.apiUrl}/avistamientos/feed?pagina=${pagina}&limite=${limite}`;
    if (especie) url += `&especie=${especie}`;
    return this.http.get(url);
  }

  // ONBOARDING
  completarOnboarding(datos: { zona_habitual: string; tipo_pescador?: string; anos_experiencia?: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/onboarding/completar`, datos);
  }

  getOnboardingEstado(): Observable<{ onboarding_completo: boolean; tiene_telefono: boolean; tiene_zona: boolean }> {
    return this.http.get<{ onboarding_completo: boolean; tiene_telefono: boolean; tiene_zona: boolean }>(
      `${this.apiUrl}/onboarding/estado`
    );
  }
}
