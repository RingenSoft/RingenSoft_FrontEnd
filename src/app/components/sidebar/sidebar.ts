import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: 'sidebar.html',
  styleUrl: 'sidebar.css'
})
export class SidebarComponent implements OnInit {
  nombreUsuario: string = 'Usuario';
  rolUsuario: string   = 'PESCADOR';

  constructor(
    private router: Router,
    private auth: AuthService   // ✅ Inyectado
  ) {}

  ngOnInit() {
    // ✅ Carga nombre y rol desde localStorage al iniciar
    this.nombreUsuario = this.auth.getUsuarioActual() || 'Usuario';
    this.rolUsuario    = localStorage.getItem('rol') || 'PESCADOR';
  }

  logout() {
    this.auth.logout();  // ✅ Limpia localStorage Y redirige
  }
}