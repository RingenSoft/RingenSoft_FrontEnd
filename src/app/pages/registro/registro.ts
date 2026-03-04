import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

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

  cargando: boolean = false;

  constructor(private auth: AuthService, private router: Router) {}

  registrar() {
    if (!this.datos.username || !this.datos.password || !this.datos.nombre_completo) {
      alert('Por favor completa todos los campos.');
      return;
    }

    this.cargando = true;

    this.auth.registro(this.datos).subscribe({
      next: () => {
        alert('¡Cuenta creada con éxito! Ahora inicia sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error(err);
        this.cargando = false;
        alert('Error al registrar. El usuario podría ya existir.');
      }
    });
  }
}
