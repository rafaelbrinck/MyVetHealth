import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tutor-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-perfil.html',
  styleUrl: './tutor-perfil.css'
})
export class TutorPerfilComponent {
  
  private router = inject(Router);

  // Dados do perfil (No futuro, o Rafael trará isto da tabela 'perfis')
  public usuario = signal({
    nome: 'Pedro Brum',
    email: 'pedro.brum@exemplo.com',
    telefone: '(51) 99999-9999',
    membroDesde: 'Março de 2026'
  });

  public notificacoesAtivas = signal(true);

  public toggleNotificacoes(): void {
    this.notificacoesAtivas.update(v => !v);
  }

  public logout(): void {
    // Simula a limpeza da sessão e volta para o login
    console.log('Encerrando sessão...');
    this.router.navigate(['/login-tutor']);
  }
}