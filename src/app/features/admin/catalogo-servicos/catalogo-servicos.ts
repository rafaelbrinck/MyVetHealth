import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase';
import { ClinicaService } from '../../../core/services/clinica.service';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

interface ServicoClinica {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  ativo: boolean;
}

@Component({
  selector: 'app-catalogo-servicos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogo-servicos.html',
})
export class CatalogoServicosComponent implements OnInit {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService);
  private fb = inject(FormBuilder);

  // Sinais de Estado
  public servicos = signal<ServicoClinica[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  public isEditing = signal<boolean>(false);

  // Formulário Reativo
  public servicoForm = this.fb.nonNullable.group({
    id: [''],
    nome: ['', [Validators.required, Validators.minLength(3)]],
    categoria: ['consulta', Validators.required],
    valor: [0, [Validators.required, Validators.min(0)]],
  });

  async ngOnInit(): Promise<void> {
    await this.carregarServicos();
  }

  public async carregarServicos(): Promise<void> {
    this.isLoading.set(true);
    try {
      const clinicaId = this.clinicaService.clinicaAtivaId;
      if (!clinicaId) return;

      const { data, error } = await this.supabase
        .from('servicos_clinica')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('ativo', { ascending: false }) // Ativos primeiro
        .order('nome', { ascending: true });

      if (error) throw error;
      this.servicos.set(data as ServicoClinica[]);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public async salvarServico(): Promise<void> {
    if (this.servicoForm.invalid) {
      alert('Por favor, preencha todos os campos corretamente.');
      return;
    }

    this.isSaving.set(true);
    try {
      const clinicaId = this.clinicaService.clinicaAtivaId;
      const formValues = this.servicoForm.getRawValue();

      const payload = {
        clinica_id: clinicaId,
        nome: formValues.nome,
        categoria: formValues.categoria,
        valor: formValues.valor,
      };

      if (this.isEditing() && formValues.id) {
        // Atualiza serviço existente
        const { error } = await this.supabase
          .from('servicos_clinica')
          .update(payload)
          .eq('id', formValues.id);
        if (error) throw error;
      } else {
        // Insere novo serviço
        const { error } = await this.supabase.from('servicos_clinica').insert(payload);
        if (error) throw error;
      }

      this.cancelarEdicao();
      await this.carregarServicos();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      alert('Falha ao salvar o serviço. Tente novamente.');
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
    // Rola para o topo no mobile para o usuário ver o form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  public cancelarEdicao(): void {
    this.isEditing.set(false);
    this.servicoForm.reset({ id: '', nome: '', categoria: 'consulta', valor: 0 });
  }

  public async alternarStatus(servico: ServicoClinica): Promise<void> {
    try {
      const novoStatus = !servico.ativo;
      const { error } = await this.supabase
        .from('servicos_clinica')
        .update({ ativo: novoStatus })
        .eq('id', servico.id);

      if (error) throw error;

      // Atualiza o Signal otimisticamente
      this.servicos.update((lista) =>
        lista.map((s) => (s.id === servico.id ? { ...s, ativo: novoStatus } : s)),
      );
    } catch (error) {
      console.error('Erro ao alternar status do serviço:', error);
      alert('Não foi possível alterar o status do serviço.');
    }
  }

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
