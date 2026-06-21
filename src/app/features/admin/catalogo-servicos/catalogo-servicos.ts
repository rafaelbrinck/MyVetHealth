import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicosService, ServicoClinica } from '../../../core/services/servicos-clinica';
import { ToastService } from '../../../core/services/toast.service';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

@Component({
  selector: 'app-catalogo-servicos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogo-servicos.html',
})
export class CatalogoServicosComponent implements OnInit {
  // 1. Injetamos o Service Central ao invés do Supabase diretamente
  public servicosService = inject(ServicosService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  // Estados locais da tela
  public isSaving = signal<boolean>(false);
  public isEditing = signal<boolean>(false);

  public servicoForm = this.fb.nonNullable.group({
    id: [''],
    nome: ['', [Validators.required, Validators.minLength(3)]],
    categoria: ['consulta', Validators.required],
    valor: [0, [Validators.required, Validators.min(0)]],
  });

  async ngOnInit(): Promise<void> {
    // 2. Chama o carregamento no Service
    await this.servicosService.carregarServicos();
  }

  public async salvarServico(): Promise<void> {
    if (this.servicoForm.invalid) {
      this.toastService.showError('Por favor, preencha todos os campos corretamente.');
      return;
    }

    this.isSaving.set(true);
    try {
      const formValues = this.servicoForm.getRawValue();

      // 3. O Service resolve se é insert ou update lá dentro
      await this.servicosService.salvarServico(formValues);

      this.cancelarEdicao();
    } catch (error) {
      this.toastService.showError('Falha ao salvar o serviço. Tente novamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  public editarServico(servico: ServicoClinica): void {
    this.isEditing.set(true);
    this.servicoForm.patchValue({
      id: servico.id,
      nome: servico.nome,
      categoria: servico.categoria,
      valor: servico.valor,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  public cancelarEdicao(): void {
    this.isEditing.set(false);
    this.servicoForm.reset({ id: '', nome: '', categoria: 'consulta', valor: 0 });
  }

  public async alternarStatus(servico: ServicoClinica): Promise<void> {
    try {
      await this.servicosService.alternarStatus(servico.id, servico.ativo);
    } catch (error) {
      this.toastService.showError('Não foi possível alterar o status do serviço.');
    }
  }

  // Mantive a estilização de Badges aqui pois é regra puramente visual do HTML
  public getBadgeClasses(categoria: string): string {
    switch (categoria) {
      case 'consulta':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'vacina':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'exame':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'procedimento':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';
    }
  }
}
