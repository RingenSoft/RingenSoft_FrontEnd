import { Component, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: 'login.html',
  styleUrl: 'login.css'
})
export class LoginComponent implements OnDestroy {
  usuario: string = '';
  password: string = '';
  errorMsg: string = '';
  infoMsg: string = '';
  cargando: boolean = false;

  private loginSub?: Subscription;
  private timerSub?: Subscription;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnDestroy() {
    this.loginSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  ingresar() {
    if (!this.usuario || !this.password) {
      this.errorMsg = 'Por favor completa todos los campos';
      return;
    }

    this.cargando = true;
    this.errorMsg = '';
    this.infoMsg = '';

    // Si tarda más de 5s, avisar que el servidor puede estar iniciando
    this.timerSub = timer(5000).subscribe(() => {
      if (this.cargando) {
        this.infoMsg = 'El servidor está iniciando, espera unos segundos...';
      }
    });

    this.loginSub = this.auth.login({ username: this.usuario, password: this.password }).subscribe({
      next: () => {
        this.cargando = false;
        this.timerSub?.unsubscribe();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.cargando = false;
        this.infoMsg = '';
        this.timerSub?.unsubscribe();

        if (err.status === 401) {
          this.errorMsg = 'Usuario o contraseña incorrectos';
        } else if (err.status === 0 || err.status === -1) {
          this.errorMsg = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
        } else if (err.status >= 500) {
          this.errorMsg = 'Error en el servidor. Intenta de nuevo en unos momentos.';
        } else {
          this.errorMsg = 'Error inesperado. Intenta de nuevo.';
        }
      }
    });
  }
}
