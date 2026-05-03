import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly themeService = inject(ThemeService);

  protected readonly title = signal('MyVetHealth');

  constructor() {
    effect(() => {
      const theme = this.themeService.theme();
      document.documentElement.classList.toggle('dark', theme === 'dark');
    });
  }
}
