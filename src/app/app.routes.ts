import { Routes } from '@angular/router';
import { authGuard } from './guards/auth_guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.RegistroComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'mapa',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/mapa/mapa').then(m => m.MapaComponent)
  },
  {
    path: 'flota',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/flota/flota').then(m => m.FlotaComponent)
  },
  {
    path: 'reportes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/reportes/reportes').then(m => m.ReportesComponent)
  },
  {
    path: 'pescar',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/pescador/pescador').then(m => m.PescadorComponent)
  },
  // ✅ Nueva ruta satelital
  {
    path: 'satelite',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/satelite/satelite').then(m => m.SateliteComponent)
  },
  { path: '**', redirectTo: 'login' }
];