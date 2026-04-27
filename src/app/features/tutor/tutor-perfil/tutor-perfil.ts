import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tutor-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-perfil.html'
})
export class TutorPerfilComponent implements OnInit {
  
  private router = inject(Router);

  public usuario = signal({
    nome: 'Pedro Brum',
    email: 'pedro.brum@exemplo.com',
    telefone: '(51) 99999-9999',
    membroDesde: 'Março de 2026',
    foto: 'P'
  });

  public notificacoesAtivas = signal(true);
  public temaEscuro = signal(false);
  public isEditModalOpen = signal(false);

  ngOnInit() {
    // Busca a preferência salva no navegador
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'dark' || (!temaSalvo && document.documentElement.classList.contains('dark'))) {
      this.temaEscuro.set(true);
      document.documentElement.classList.add('dark');
    } else {
      this.temaEscuro.set(false);
      document.documentElement.classList.remove('dark');
    }
  }

  public toggleTema(): void {
    const isDark = !this.temaEscuro();
    this.temaEscuro.set(isDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tema', 'dark'); // Salva no navegador
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tema', 'light'); // Salva no navegador
    }
  }

  public toggleNotificacoes(): void { this.notificacoesAtivas.update(v => !v); }
  public abrirEdicao(): void { this.isEditModalOpen.set(true); }
  public fecharEdicao(): void { this.isEditModalOpen.set(false); }

  public aoEscolherFoto(event: any): void {
    const file = event.target.files[0];
    if (file) this.usuario.update(u => ({ ...u, foto: '📸' }));
  }

  public salvarEdicao(email: string, telefone: string): void {
    if (!email.trim() || !telefone.trim()) return;
    this.usuario.update(u => ({ ...u, email, telefone }));
    this.fecharEdicao();
  }

  public logout(): void { this.router.navigate(['/login-tutor']); }
}