import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ErrorToastComponent } from './components/error-toast/error-toast';
import { ConnectionBannerComponent } from './components/connection-banner/connection-banner';
import { SosButtonComponent } from './components/sos-button/sos-button';
import { OnboardingComponent } from './components/onboarding/onboarding';
import { ThemeService } from './services/theme.service';
import { SidebarStateService } from './services/sidebar-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ErrorToastComponent, ConnectionBannerComponent, SosButtonComponent, OnboardingComponent],
  templateUrl: 'app.html',
  styleUrl: 'app.css'
})
export class AppComponent implements OnInit {
  private readonly theme   = inject(ThemeService);
  readonly sidebar = inject(SidebarStateService);
  title = 'ringensoft-frontend';

  ngOnInit(): void {
    this.theme.aplicarTema(this.theme.tema());
  }
}
