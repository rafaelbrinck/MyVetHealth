import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';

export interface ServicoClinica {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  ativo: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ServicosService {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService);

  // O Estado Global dos serviços dessa clínica
  public servicos = signal<ServicoClinica[]>([]);
  public isLoading = signal<boolean>(false);

  /** * Carrega a lista completa do banco e atualiza o Signal.
   */
  public async carregarServicos(): Promise<void> {
    this.isLoading.set(true);
    try {
      const clinicaId = this.clinicaService.clinicaAtivaId;
      if (!clinicaId) return;

      const { data, error } = await this.supabase
        .from('servicos_clinica')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('ativo', { ascending: false })
        .order('nome', { ascending: true });

      if (error) throw error;

      this.servicos.set(data as ServicoClinica[]);
    } catch (error) {
      console.error('Erro no ServicosService:', error);
      throw error; // Repassa para o componente tratar (exibir alert, etc)
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Insere ou atualiza um serviço na base de dados
   */
  public async salvarServico(servico: Partial<ServicoClinica>): Promise<void> {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Clínica não identificada');

    const payload = {
      clinica_id: clinicaId,
      nome: servico.nome,
      categoria: servico.categoria,
      valor: servico.valor,
    };

    if (servico.id) {
      const { error } = await this.supabase
        .from('servicos_clinica')
        .update(payload)
        .eq('id', servico.id);
      if (error) throw error;
    } else {
      const { error } = await this.supabase.from('servicos_clinica').insert(payload);
      if (error) throw error;
    }

    // Após salvar, recarrega a lista para manter o cache sincronizado
    await this.carregarServicos();
  }

  /**
   * Atualiza o status ativo/inativo direto no banco e no Signal local
   */
  public async alternarStatus(id: string, statusAtual: boolean): Promise<void> {
    const novoStatus = !statusAtual;
    const { error } = await this.supabase
      .from('servicos_clinica')
      .update({ ativo: novoStatus })
      .eq('id', id);

    if (error) throw error;

    // Atualização Otimista no Signal
    this.servicos.update((lista) =>
      lista.map((s) => (s.id === id ? { ...s, ativo: novoStatus } : s)),
    );
  }
}
