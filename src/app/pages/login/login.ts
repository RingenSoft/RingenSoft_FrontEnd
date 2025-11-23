import { Component } from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {AuthService} from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule,RouterLink],
  templateUrl: 'login.html',
  styleUrl: 'login.css'
})
export class LoginComponent {
  usuario: string = '';
  password: string = '';
  errorMsg: string = '';
  cargando: boolean = false;

  constructor(private auth: AuthService, private router: Router) {}

  ingresar() {
    // Validación básica de campos vacíos
    if (!this.usuario || !this.password) {
      this.errorMsg = 'Por favor completa todos los campos';
      return;
    }

    this.cargando = true;
    this.errorMsg = '';

    const credenciales = {
      username: this.usuario,
      password: this.password
    };

    // Llamada al servicio de autenticación
    this.auth.login(credenciales).subscribe({
      next: (res) => {
        console.log('Login exitoso', res);
        this.cargando = false;
        // Si el login es correcto, navegamos al sistema
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Error login', err);
        this.cargando = false;

        // Manejo de errores HTTP del backend
        if (err.status === 401) {
          this.errorMsg = 'Contraseña incorrecta';
        } else if (err.status === 404) {
          this.errorMsg = 'Usuario no encontrado';
        } else {
          this.errorMsg = 'Error de conexión con el servidor';
        }
      }
    });
  }
}
