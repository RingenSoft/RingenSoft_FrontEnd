import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Solo necesitamos esto para la navegación
  templateUrl: 'app.html',
  styleUrl: 'app.css'
})
export class AppComponent {
  title = 'ringensoft-frontend';
}
