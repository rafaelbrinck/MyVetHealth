import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';
import { ConsultaView, StatusConsulta } from '../models/consulta.model';

@Injectable({
  providedIn: 'root',
})
export class ConsultaService {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService);

  // O State Principal (Todas as consultas da clínica)
  private _consultas = signal<ConsultaView[]>([]);
  public consultas = this._consultas.asReadonly();

  // ==========================================
  // ESTADOS DERIVADOS (COMPUTED SIGNALS)
  // ==========================================

  // Esse signal reage automaticamente! Se _consultas mudar, ele recalcula a fila de hoje.
  public filaHoje = computed(() => {
    const hoje = new Date();
    return this._consultas()
      .filter((consulta) => {
        return (
          consulta.data_completa.getDate() === hoje.getDate() &&
          consulta.data_completa.getMonth() === hoje.getMonth() &&
          consulta.data_completa.getFullYear() === hoje.getFullYear() &&
          consulta.status !== 'Finalizado' &&
          consulta.status !== 'Cancelado'
        );
      })
      .sort((a, b) => a.data_completa.getTime() - b.data_completa.getTime()); // Ordena por horário
  });

  // ==========================================
  // MÉTODOS DE DADOS
  // ==========================================

  /**
   * Busca as consultas no banco fazendo JOIN com Pets e Perfis (Tutores)
   */
  async carregarConsultasDaClinica() {
    const clinicaId = this.clinicaService.clinica().id;

    if (!clinicaId) {
      console.error('Nenhuma clínica ativa selecionada.');
      return;
    }

    // A mágica do Supabase: Navegando pelas Foreign Keys (consultas -> pets -> perfis)
    const { data, error } = await this.supabase
      .from('consultas')
      .select(
        `
        id,
        status,
        data_consulta,
        pets (
          nome,
          especie,
          raca,
          perfis ( nome_completo )
        )
      `,
      )
      .eq('clinica_id', clinicaId)
      .order('data_consulta', { ascending: true });

    if (error) {
      console.error('Erro ao carregar consultas:', error);
      throw error;
    }

    // Mapeia os dados do banco (nested objects) para a nossa View limpa
    const consultasFormatadas: ConsultaView[] = data.map((item: any) => {
      const dataObj = new Date(item.data_consulta);

      return {
        id: item.id,
        status: item.status as StatusConsulta,
        data_completa: dataObj,
        horario: dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), // Gera "09:00"
        pet: item.pets?.nome || 'Desconhecido',
        especie: item.pets?.especie || 'Outro',
        raca: item.pets?.raca || null,
        // O Supabase retorna array quando faz join com tabelas que poderiam ser 1:N, pegamos o índice [0] ou direto o objeto dependendo da FK
        tutor: item.pets?.perfis?.nome_completo || 'Sem tutor vinculado',
      };
    });

    this._consultas.set(consultasFormatadas);
  }

  /**
   * Atualiza o status de uma consulta em tempo real (Ex: Agendado -> Aguardando)
   */
  async atualizarStatus(consultaId: string, novoStatus: StatusConsulta) {
    const { error } = await this.supabase
      .from('consultas')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', consultaId);

    if (error) throw error;

    // Atualiza o Signal localmente para a tela piscar na hora, sem precisar recarregar o banco todo
    this._consultas.update((consultas) =>
      consultas.map((c) => (c.id === consultaId ? { ...c, status: novoStatus } : c)),
    );
  }
}
