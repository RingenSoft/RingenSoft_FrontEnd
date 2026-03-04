import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth'; // Tu servicio correcto

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: 'login.html',
  styleUrl: 'login.css'
})
export class LoginComponent {
  // Variables que usa el HTML nuevo
  usuario: string = '';
  password: string = '';
  errorMsg: string = '';
  cargando: boolean = false;

  constructor(private auth: AuthService, private router: Router) {}

  ingresar() {
    // 1. Validación Local
    if (!this.usuario || !this.password) {
      this.errorMsg = 'Por favor ingresa tu ID y contraseña.';
      return;
    }

    this.cargando = true;
    this.errorMsg = '';

    const credenciales = {
      username: this.usuario, // El backend espera "username"
      password: this.password
    };

    // 2. Llamada al AuthService
    this.auth.login(credenciales).subscribe({
      next: (res) => {
        console.log('Login exitoso', res);
        this.cargando = false;
        // Redirigir al Dashboard tras éxito
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Error login', err);
        this.cargando = false;

        // Mensajes amigables según error
        if (err.status === 401) {
          this.errorMsg = 'Credenciales incorrectas. Verifica tu contraseña.';
        } else if (err.status === 404) {
          this.errorMsg = 'Usuario no encontrado en el sistema.';
        } else if (err.status === 0) {
          this.errorMsg = 'No hay conexión con el servidor.';
        } else {
          this.errorMsg = 'Error inesperado. Intenta más tarde.';
        }
      }
    });
  }
}
