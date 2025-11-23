import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {AuthService} from '../../services/auth';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: 'registro.html',
  styleUrl: 'registro.css'
})
export class RegistroComponent {
  usuario: string = '';
  password: string = '';
  nombre: string = '';

  mensaje: string = '';
  error: boolean = false;
  cargando: boolean = false;

  constructor(private auth: AuthService, private router: Router) {}

  registrar() {
    if (!this.usuario || !this.password || !this.nombre) {
      this.mostrarError('Completa todos los campos');
      return;
    }

    this.cargando = true;
    this.mensaje = '';

    const datos = {
      username: this.usuario,
      password: this.password,
      nombre_completo: this.nombre
    };

    this.auth.registro(datos).subscribe({
      next: (res) => {
        this.error = false;
        this.mensaje = '¡Cuenta creada con éxito! Redirigiendo...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 400) {
          this.mostrarError('El nombre de usuario ya existe.');
        } else {
          this.mostrarError('Error al conectar con el servidor.');
        }
      }
    });
  }

  mostrarError(msg: string) {
    this.error = true;
    this.mensaje = msg;
    this.cargando = false;
  }
}
