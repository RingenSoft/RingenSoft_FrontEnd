import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../toast/toast.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: 'registro.html',
  styleUrl: 'registro.css'
})
export class RegistroComponent {

  datos = {
    nombre_completo: '',
    username: '',
    password: ''
  };

  cargando = false;
  errorMsg = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService  // ✅ Inyectado
  ) {}

  registrar() {
    this.errorMsg = '';

    if (!this.datos.username.trim() || !this.datos.password || !this.datos.nombre_completo.trim()) {
      this.errorMsg = 'Por favor completa todos los campos.';
      return;
    }

    if (this.datos.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.cargando = true;

    this.auth.registro(this.datos).subscribe({
      next: () => {
        this.cargando = false;
        this.toast.success('¡Cuenta creada con éxito! Ahora inicia sesión.');  // ✅ Toast
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 400) {
          this.errorMsg = 'Este nombre de usuario ya existe. Elige otro.';
        } else if (err.status === 0) {
          this.errorMsg = 'No hay conexión con el servidor.';
        } else {
          this.errorMsg = 'Error al registrar. Intenta nuevamente.';
        }
      }
    });
  }
}