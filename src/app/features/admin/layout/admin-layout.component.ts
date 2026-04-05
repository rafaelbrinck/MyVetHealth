import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  isMobileMenuOpen = signal(false);

  toggleMenu() {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMenu() {
    this.isMobileMenuOpen.set(false);
  }
}
