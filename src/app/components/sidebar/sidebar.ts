import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: 'sidebar.html',
  styleUrl: 'sidebar.css'
})
export class SidebarComponent {
  constructor(private router: Router) {}

  logout() {
    // Aquí podrías limpiar tokens si los tuvieras
    this.router.navigate(['/login']);
  }
}
