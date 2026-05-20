import { Component, inject } from '@angular/core';
import { ConnectionService } from '../../services/connection.service';

@Component({
  selector: 'app-connection-banner',
  standalone: true,
  template: `
    @if (!conn.online()) {
      <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg animate-fade-in-up text-xs font-semibold"
           style="background:#8A1818;color:#F8FAFC;border:1px solid rgba(255,255,255,0.15);font-family:Inter,sans-serif;">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0"/>
          <circle cx="12" cy="20" r="1"/>
        </svg>
        Sin conexión a internet
      </div>
    }
  `
})
export class ConnectionBannerComponent {
  readonly conn = inject(ConnectionService);
}
