import { Routes } from '@angular/router';
import {LoginComponent} from './pages/login/login';
import {RegistroComponent} from './pages/registro/registro';
import {DashboardComponent} from './pages/dashboard/dashboard';
import {MapaComponent} from './pages/mapa/mapa';
import {FlotaComponent} from './pages/flota/flota';
import {ReportesComponent} from './pages/reportes/reportes';
import {authGuard} from './guards/auth-guard';
import { AlertasComponent } from './pages/alertas/alertas';
import { PerfilComponent } from './pages/perfil/perfil';
import { PlanificadorComponent } from './pages/planificador/planificador';
import { MapaCalorComponent } from './pages/mapa-calor/mapa-calor';
import { ZonaPescadoresComponent } from './pages/zona-pescadores/zona-pescadores';
import { CondicionesComponent } from './pages/condiciones/condiciones';
import { RankingsComponent } from './pages/rankings/rankings';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // --- Rutas Públicas ---
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },

  // --- Rutas Privadas (Requieren Login) ---
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'perfil', component: PerfilComponent, canActivate: [authGuard] },
  { path: 'planificador', component: PlanificadorComponent, canActivate: [authGuard] },
  { path: 'mapa-calor', component: MapaCalorComponent, canActivate: [authGuard] },
  { path: 'mapa', component: MapaComponent, canActivate: [authGuard] },
  { path: 'flota', component: FlotaComponent, canActivate: [authGuard] },
  { path: 'reportes', component: ReportesComponent, canActivate: [authGuard] },
  { path: 'alertas', component: AlertasComponent, canActivate: [authGuard] },
  { path: 'zona-pescadores', component: ZonaPescadoresComponent, canActivate: [authGuard] },
  { path: 'condiciones', component: CondicionesComponent, canActivate: [authGuard] },
  { path: 'rankings', component: RankingsComponent, canActivate: [authGuard] },
];
