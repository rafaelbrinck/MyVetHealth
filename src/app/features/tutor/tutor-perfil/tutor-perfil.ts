import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-tutor-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-perfil.html',
})
export class TutorPerfilComponent {
  private router = inject(Router);
  private auth = inject(Auth);
  readonly themeService = inject(ThemeService);
  public usuario = signal({
    nome: 'Pedro Brum',
    email: 'pedro.brum@exemplo.com',
    telefone: '(51) 99999-9999',
    membroDesde: 'Março de 2026',
    foto: 'P',
  });

  public notificacoesAtivas = signal(true);
  public isEditModalOpen = signal(false);

  public toggleNotificacoes(): void {
    this.notificacoesAtivas.update((v) => !v);
  }
  public abrirEdicao(): void {
    this.isEditModalOpen.set(true);
  }
  public fecharEdicao(): void {
    this.isEditModalOpen.set(false);
  }

  public aoEscolherFoto(event: any): void {
    const file = event.target.files[0];
    if (file) this.usuario.update((u) => ({ ...u, foto: '📸' }));
  }

  public salvarEdicao(email: string, telefone: string): void {
    if (!email.trim() || !telefone.trim()) return;
    this.usuario.update((u) => ({ ...u, email, telefone }));
    this.fecharEdicao();
  }

  public async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
