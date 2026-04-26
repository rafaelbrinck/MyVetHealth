import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-tutor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-tutor.html',
  styleUrl: './login-tutor.css'
})
export class LoginTutorComponent {
  
  private router = inject(Router);

  public fazerLogin(email: string, senha: string): void {
    if (!email || !senha) {
      alert('⚠️ Preencha seu e-mail e senha para continuar.');
      return;
    }

    // Como esta tela é específica do Tutor, redirecionamos direto para o App Mobile
    console.log('Login de Tutor com sucesso. Redirecionando...');
    this.router.navigate(['/tutor/dashboard']);
  }
}