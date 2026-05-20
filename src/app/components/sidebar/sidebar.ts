import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AlertaBadgeService } from '../../services/alerta-badge.service';
import { ThemeService } from '../../services/theme.service';
import { SidebarStateService } from '../../services/sidebar-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: 'sidebar.html',
  styleUrl: 'sidebar.css'
})
export class SidebarComponent {
  readonly theme   = inject(ThemeService);
  readonly sidebar = inject(SidebarStateService);

  constructor(
    private authService: AuthService,
    public alertaBadge: AlertaBadgeService
  ) {}

  // Cierra el sidebar al navegar en móvil
  onLinkClick(): void {
    if (window.innerWidth < 768) this.sidebar.close();
  }

  @HostListener('window:resize')
  onResize(): void {
    // En desktop siempre abierto
    if (window.innerWidth >= 768) this.sidebar.open();
  }

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

  logout(): void {
    this.authService.logout();
  }
}
