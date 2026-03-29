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

  logout() {
    this.authService.logout();
  }
}
