import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../../core/services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // Injeções de dependência modernas do Angular 17
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);

  // Configuração do formulário com validações
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Controle de estado da tela
  isLoading = false;
  errorMessage = '';

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Destaca os campos com erro
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    try {
      // Chama o Supabase através do nosso serviço
      await this.authService.login(email!, password!);

      const role = await firstValueFrom(this.authService.getUserRole());

      // Roteamento inteligente B2B vs B2C
      if (role === 'tutor') {
        this.router.navigate(['/meus-pets']);
      } else {
        this.router.navigate(['/clinica/admin']);
      }
    } catch (error: any) {
      // O Supabase retorna erros amigáveis, mas podemos padronizar a mensagem
      this.errorMessage = 'E-mail ou senha inválidos. Tente novamente.';
      console.error('Erro no login:', error.message);
    } finally {
      this.isLoading = false;
    }
  }

  // Helpers para o HTML verificar erros de forma mais limpa
  get emailError() {
    const control = this.loginForm.get('email');
    return control?.invalid && control?.touched;
  }

  get passwordError() {
    const control = this.loginForm.get('password');
    return control?.invalid && control?.touched;
  }
}
