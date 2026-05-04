import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LucideAngularModule, Moon, Sun } from 'lucide-angular';
import { Auth } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  private authService = inject(Auth);
  private router = inject(Router);
  readonly themeService = inject(ThemeService);

  /** Lucide icon data for `<lucide-icon [img]="…">` */
  protected readonly lucideSun = Sun;
  protected readonly lucideMoon = Moon;
  isMobileMenuOpen = signal(false);
  public papelAtivo = signal<string | null>(this.authService.getUserRoleValue());
  public isSettingsOpen = signal(false);

  public podeAcessar(rolesPermitidas: string[]): boolean {
    const papel = this.papelAtivo();
    if (!papel) return false;
    return rolesPermitidas.includes(papel);
  }

  toggleMenu() {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMenu() {
    this.isMobileMenuOpen.set(false);
  }

  public toggleSettings() {
    this.isSettingsOpen.update((v) => !v);
  }

  logout() {
    this.authService.logout();
    this.closeMenu();
    // Redirecionar para a página de login
    this.router.navigate(['/login']);
  }
}
