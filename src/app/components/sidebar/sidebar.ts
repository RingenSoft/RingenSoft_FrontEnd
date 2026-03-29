import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AlertaBadgeService } from '../../services/alerta-badge.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: 'sidebar.html',
  styleUrl: 'sidebar.css'
})
export class SidebarComponent {
  constructor(
    private authService: AuthService,
    public alertaBadge: AlertaBadgeService
  ) {}

  getNombreCorto(): string {
    const nombre = localStorage.getItem('usuario') || 'Usuario';
    return nombre.split(' ')[0];
  }

  getIniciales(): string {
    const nombre = localStorage.getItem('usuario') || 'U';
    return nombre
      .split(' ')
      .map((n: string) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRol(): string {
    return (localStorage.getItem('rol') || 'pescador').toLowerCase();
  }

  logout() {
    this.authService.logout();
  }
}
