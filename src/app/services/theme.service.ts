import { Injectable, signal } from '@angular/core';

export type Tema = 'carta-nautica' | 'oscuro';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly tema = signal<Tema>(this.detectarTema());

  constructor() {
    this.aplicarTema(this.tema());
  }

  private detectarTema(): Tema {
    // Carta náutica por defecto — solo cambia si el usuario lo guardó explícitamente
    const guardada = localStorage.getItem('tema') as Tema | null;
    if (guardada === 'carta-nautica' || guardada === 'oscuro') return guardada;
    return 'carta-nautica';
  }

  aplicarTema(t: Tema): void {
    const root = document.documentElement;
    if (t === 'oscuro') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  toggleTema(): void {
    const siguiente: Tema = this.tema() === 'carta-nautica' ? 'oscuro' : 'carta-nautica';
    this.tema.set(siguiente);
    localStorage.setItem('tema', siguiente);
    this.aplicarTema(siguiente);
  }

  setTema(t: Tema): void {
    this.tema.set(t);
    localStorage.setItem('tema', t);
    this.aplicarTema(t);
  }
}
