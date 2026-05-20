import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectionService {

  readonly online = signal<boolean>(navigator.onLine);

  constructor() {
    window.addEventListener('online',  () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}
