import { Routes } from '@angular/router';
import {LoginComponent} from './pages/login/login';
import {RegistroComponent} from './pages/registro/registro';
import {DashboardComponent} from './pages/dashboard/dashboard';
import {MapaComponent} from './pages/mapa/mapa';
import {FlotaComponent} from './pages/flota/flota';
import {ReportesComponent} from './pages/reportes/reportes';
import {authGuard} from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // --- Rutas Públicas ---
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent }, // <--- NUEVA RUTA

  // --- Rutas Privadas (Requieren Login) ---
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'mapa', component: MapaComponent, canActivate: [authGuard] },
  { path: 'flota', component: FlotaComponent, canActivate: [authGuard] },
  { path: 'reportes', component: ReportesComponent, canActivate: [authGuard] }
];
