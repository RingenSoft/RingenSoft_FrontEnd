import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  // En desktop (≥ 768px) abierto por defecto; en móvil cerrado
  readonly isOpen = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  toggle(): void { this.isOpen.update(v => !v); }
  open():   void { this.isOpen.set(true);  }
  close():  void { this.isOpen.set(false); }
}
