import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // --- Rutas Públicas ---
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.RegistroComponent)
  },

  // --- Rutas Privadas (Requieren Login) ---
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then(m => m.PerfilComponent),
    canActivate: [authGuard]
  },
  {
    path: 'planificador',
    loadComponent: () => import('./pages/planificador/planificador').then(m => m.PlanificadorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'mapa-calor',
    loadComponent: () => import('./pages/mapa-calor/mapa-calor').then(m => m.MapaCalorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'mapa',
    loadComponent: () => import('./pages/mapa/mapa').then(m => m.MapaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'flota',
    loadComponent: () => import('./pages/flota/flota').then(m => m.FlotaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes').then(m => m.ReportesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'alertas',
    loadComponent: () => import('./pages/alertas/alertas').then(m => m.AlertasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'zona-pescadores',
    loadComponent: () => import('./pages/zona-pescadores/zona-pescadores').then(m => m.ZonaPescadoresComponent),
    canActivate: [authGuard]
  },
  {
    path: 'condiciones',
    loadComponent: () => import('./pages/condiciones/condiciones').then(m => m.CondicionesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'rankings',
    loadComponent: () => import('./pages/rankings/rankings').then(m => m.RankingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'bitacora',
    loadComponent: () => import('./pages/bitacora/bitacora').then(m => m.BitacoraComponent),
    canActivate: [authGuard]
  },
];
