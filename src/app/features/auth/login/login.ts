import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isLoading = false;
  errorMessage = '';

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    try {
      await this.authService.login(email!, password!);

      const role = this.authService.getUserRoleValue();

      if (role === 'tutor') {
        this.router.navigate(['/tutor/meus-pets']);
      } else if (
        role === 'admin_clinica' ||
        role === 'veterinario' ||
        role === 'recepcionista' ||
        role === 'admin_plataforma'
      ) {
        this.router.navigate(['/hub']);
      } else {
        this.errorMessage = 'Perfil não configurado no sistema. Contate o suporte.';
        this.authService.logout();
      }
    } catch (error: any) {
      this.errorMessage = 'E-mail ou senha inválidos. Tente novamente.';
    } finally {
      this.isLoading = false;
    }
  }

  get emailError() {
    const control = this.loginForm.get('email');
    return control?.invalid && control?.touched;
  }

  get passwordError() {
    const control = this.loginForm.get('password');
    return control?.invalid && control?.touched;
  }
}
