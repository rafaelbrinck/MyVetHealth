import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../../core/services/auth';
import { ClinicaService } from '../../../core/services/clinica.service';
import { CriarClinicaDTO, PapelEquipe, WorkspaceClinica } from '../../../core/models/clinica.model';

@Component({
  selector: 'app-workspace-clinicas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workspace-clinicas.html',
  styleUrl: './workspace-clinicas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceClinicas implements OnInit {
  private authService = inject(Auth);
  private clinicaService = inject(ClinicaService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  clinicas = signal<WorkspaceClinica[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  modoAcao = signal<'nenhum' | 'convite' | 'nova_clinica'>('nenhum');
  errorMessage = signal('');

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

  async ngOnInit(): Promise<void> {
    const autenticado = await this.authService.ensureAuthenticated();
    if (!autenticado) {
      await this.router.navigateByUrl('/login');
      return;
    }

    this.userId = this.authService.getCurrentUserId();
    if (!this.userId) {
      await this.router.navigateByUrl('/login');
      return;
    }

    await this.carregarClinicas();
  }

  async carregarClinicas(): Promise<void> {
    if (!this.userId) return;

    this.isLoading.set(true);
    try {
      const clinicasDoUsuario = await this.clinicaService.getClinicasDoUsuario(this.userId);
      this.clinicas.set(clinicasDoUsuario);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async acessarClinica(clinica: WorkspaceClinica): Promise<void> {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      localStorage.setItem('clinica_ativa', clinica.id);
      this.authService.setPapelWorkspace(clinica.papel, clinica.id);
      await this.clinicaService.setarClinicaAtiva(clinica.id);
      await this.authService.ensureRoleForActiveClinic();
      await this.router.navigateByUrl('/clinica/dashboard');
    } catch (error) {
      console.error('Erro ao acessar clínica:', error);
      this.errorMessage.set('Não foi possível entrar na clínica. Tente novamente.');
      localStorage.removeItem('clinica_ativa');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  abrirModo(modo: 'convite' | 'nova_clinica'): void {
    this.modoAcao.set(modo);
  }

  voltar(): void {
    this.modoAcao.set('nenhum');
  }

  async salvarNovaClinica(): Promise<void> {
    if (this.novaClinicaForm.invalid || !this.userId) {
      this.novaClinicaForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const valores = this.novaClinicaForm.value as CriarClinicaDTO;
      const novaClinicaId = await this.clinicaService.criarClinicaEVincular(this.userId, valores);

      localStorage.setItem('clinica_ativa', novaClinicaId);
      this.authService.setPapelWorkspace('admin_clinica', novaClinicaId);
      await this.clinicaService.setarClinicaAtiva(novaClinicaId);
      await this.authService.ensureRoleForActiveClinic();
      await this.router.navigateByUrl('/clinica/dashboard');
    } catch (error: unknown) {
      console.error('Erro ao criar clínica:', error);
      this.errorMessage.set(
        'Não foi possível criar a clínica. Verifique os dados (o CNPJ pode já estar em uso).',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.novaClinicaForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  async validarConvite(tokenOriginal: string): Promise<void> {
    if (!this.userId) return;

    const tokenFormatado = tokenOriginal.trim().toUpperCase();

    if (!tokenFormatado) {
      this.errorMessage.set('Por favor, digite o código do convite.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const clinicaId = await this.clinicaService.aceitarConvite(this.userId, tokenFormatado);

      localStorage.setItem('clinica_ativa', clinicaId);
      await this.clinicaService.setarClinicaAtiva(clinicaId);
      await this.authService.ensureRoleForActiveClinic();
      await this.router.navigateByUrl('/clinica/dashboard');
    } catch (error: unknown) {
      console.error('Erro ao validar convite:', error);
      const mensagem = error instanceof Error ? error.message : 'Erro ao validar o código. Tente novamente.';
      this.errorMessage.set(mensagem);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async acessarAreaTutor(): Promise<void> {
    this.clinicaService.limparClinicaAtiva();
    this.authService.setPapelTutor();
    await this.router.navigateByUrl('/tutor/dashboard');
  }
}
