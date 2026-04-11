import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicaService } from '../../../core/services/clinica.service';

@Component({
  selector: 'app-workspace-clinicas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workspace-clinicas.html',
  styleUrl: './workspace-clinicas.css',
})
export class WorkspaceClinicas implements OnInit {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService); // Injetando o service
  private router = inject(Router);
  private fb = inject(FormBuilder);

  clinicas = signal<any[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  modoAcao = signal<'nenhum' | 'convite' | 'nova_clinica'>('nenhum');
  errorMessage = signal('');

  // Guardamos o ID do usuário para não ter que buscar toda hora
  private userId: string | null = null;

  novaClinicaForm = this.fb.group({
    razaoSocial: ['', Validators.required],
    nomeFantasia: ['', Validators.required],
    cnpj: ['', Validators.required],
    telefone: ['', Validators.required],
    cep: [''],
    cidade: [''],
    uf: [''],
  });

  async ngOnInit() {
    // 1. Pegamos a identidade do usuário primeiro
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.userId = user.id;

    // 2. Disparamos a busca
    await this.carregarClinicas();
  }

  async carregarClinicas() {
    this.isLoading.set(true);
    try {
      // O componente apenas consome a lista limpa que o Service devolve
      const clinicasDoUsuario = await this.clinicaService.getClinicasDoUsuario(this.userId!);
      this.clinicas.set(clinicasDoUsuario);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  acessarClinica(clinicaId: string) {
    localStorage.setItem('clinica_ativa', clinicaId);
    this.router.navigate(['/clinica/dashboard']);
  }

  abrirModo(modo: 'convite' | 'nova_clinica') {
    this.modoAcao.set(modo);
  }

  voltar() {
    this.modoAcao.set('nenhum');
  }

  async salvarNovaClinica() {
    if (this.novaClinicaForm.invalid) {
      this.novaClinicaForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const valores = this.novaClinicaForm.value;

      // Toda a lógica suja de banco de dados foi delegada para o Service
      const novaClinicaId = await this.clinicaService.criarClinicaEVincular(this.userId!, valores);

      // Se deu tudo certo, seta no storage e vai pro Dashboard!
      localStorage.setItem('clinica_ativa', novaClinicaId);
      this.router.navigate(['/clinica/dashboard']);
    } catch (error: any) {
      console.error('Erro ao criar clínica:', error);
      this.errorMessage.set(
        'Não foi possível criar a clínica. Verifique os dados (o CNPJ pode já estar em uso).',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  isFieldInvalid(field: string) {
    const control = this.novaClinicaForm.get(field);
    return control?.invalid && control?.touched;
  }

  async validarConvite(tokenOriginal: string) {
    // Limpa espaços e deixa tudo maiúsculo para evitar erros de digitação do usuário
    const tokenFormatado = tokenOriginal.trim().toUpperCase();

    if (!tokenFormatado) {
      this.errorMessage.set('Por favor, digite o código do convite.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      // Chama o nosso Service passando o ID do usuário e o token
      const clinicaId = await this.clinicaService.aceitarConvite(this.userId!, tokenFormatado);

      // Se deu tudo certo, seta no storage e vai pro Dashboard!
      localStorage.setItem('clinica_ativa', clinicaId);
      this.router.navigate(['/clinica/dashboard']);
    } catch (error: any) {
      console.error('Erro ao validar convite:', error);
      // Pega a mensagem de erro que disparamos lá no Service
      this.errorMessage.set(error.message || 'Erro ao validar o código. Tente novamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
