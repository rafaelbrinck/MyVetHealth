import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';
import { CalendarEvent } from 'angular-calendar';
import { addHours } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

export type StatusConsulta =
  | 'agendada'
  | 'aguardando'
  | 'em_andamento'
  | 'aguardando_pagamento'
  | 'finalizada'
  | 'cancelada';

export interface ConsultaView {
  id: string;
  status: StatusConsulta;
  data_completa: Date;
  horario: string;
  pet: string;
  pet_id: string;
  especie: string;
  raca: string | null;
  tutor: string;
  veterinario?: string;
  veterinario_id: string | null;
  atualizado_em: Date | null;
  servico?: string; // Nome do serviço prestado
  valor_servico?: number; // NOVO: Valor numérico do serviço vindo do banco
  sintomas?: string | null;
}

export interface ConsultaTutorView {
  id: string;
  status: string;
  sintomas: string;
  resumo_publico: string | null;
  data: string;
  hora: string;
  pet: string;
  vet: string;
}

interface ConsultaTutorRow {
  id: string;
  status: string;
  sintomas: string | null;
  resumo_publico: string | null;
  data: string;
  hora: string;
  pet: string;
  vet: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ConsultaService {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService);
  private destroyRef = inject(DestroyRef); // Gerenciador de ciclo de vida

  // Estado central
  private _consultas = signal<ConsultaView[]>([]);
  public consultas = this._consultas.asReadonly();

  private realtimeChannel!: RealtimeChannel; // Referência do canal WebSocket
  private _consultasTutor = signal<ConsultaTutorView[]>([]);
  private _consultasTutorLoaded = signal(false);

  public consultasTutor = this._consultasTutor.asReadonly();

  // Fila do Dashboard
  public filaHoje = computed(() => {
    const hoje = new Date();
    return this._consultas()
      .filter((consulta) => {
        return (
          consulta.data_completa.getDate() === hoje.getDate() &&
          consulta.data_completa.getMonth() === hoje.getMonth() &&
          consulta.data_completa.getFullYear() === hoje.getFullYear() &&
          consulta.status !== 'finalizada' &&
          consulta.status !== 'cancelada' &&
          consulta.status !== 'aguardando_pagamento'
        );
      })
      .sort((a, b) => a.data_completa.getTime() - b.data_completa.getTime());
  });

  public filaAguardandoPagamento = computed(() => {
    const hoje = new Date();
    return this._consultas()
      .filter((consulta) => {
        return (
          consulta.status === 'aguardando_pagamento' &&
          consulta.data_completa.getDate() === hoje.getDate() &&
          consulta.data_completa.getMonth() === hoje.getMonth() &&
          consulta.data_completa.getFullYear() === hoje.getFullYear()
        );
      })
      .sort((a, b) => a.data_completa.getTime() - b.data_completa.getTime());
  });

  // Mapeamento reativo para o Angular Calendar
  public eventosCalendario = computed<CalendarEvent[]>(() => {
    return this._consultas().map((consulta) => {
      // Formatação local do valor numérico para Moeda (BRL)
      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(consulta.valor_servico || 0);

      return {
        id: consulta.id,
        start: consulta.data_completa,
        end: addHours(consulta.data_completa, 1),
        title: `
          <div class="flex flex-col gap-1.5 p-1 h-full font-sans">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-neutral-900 leading-none">
                🐾 ${consulta.pet} <span class="font-normal text-xs text-neutral-600">(${consulta.especie})</span>
              </span>
              <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/50 text-neutral-800">
                ${consulta.horario}
              </span>
            </div>
            <span class="text-xs text-neutral-700 leading-none flex items-center gap-1">
              📋 Serviço: <span class="font-bold text-neutral-800">${consulta.servico} <span class="text-neutral-500 font-normal">(${valorFormatado})</span></span>
            </span>
            <span class="text-xs text-neutral-700 leading-none flex items-center gap-1">
              👤 Tutor: <span class="font-medium">${consulta.tutor}</span>
            </span>
            <span class="text-xs font-semibold text-teal-800 bg-teal-50/50 rounded p-1 mt-auto leading-none border border-teal-100/50">
              🩺 Vet: ${consulta.veterinario || 'Agenda Aberta'}
            </span>
          </div>
        `,
        meta: { consultaOriginal: consulta },
        color: this.definirCorPorStatus(consulta.status),
        cssClass: 'vet-calendar-card',
        draggable: false,
      };
    });
  });

  async carregarAgendaPorPeriodo(dataInicio: Date, dataFim: Date) {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) return;

    const { data, error } = await this.supabase
      .from('consultas')
      .select(
        `
        id, status, data_consulta, pet_id, veterinario_id, atualizado_em, sintomas,
        pets ( nome, especie, raca, perfis ( nome_completo ) ),
        equipe_clinica ( perfis ( nome_completo ) ),
        servicos_clinica ( nome, valor )
      `, // Retorna o objeto completo do serviço com nome e valor
      )
      .eq('clinica_id', clinicaId)
      .gte('data_consulta', dataInicio.toISOString())
      .lte('data_consulta', dataFim.toISOString())
      .order('data_consulta', { ascending: true });

    if (error) {
      console.error('Erro ao carregar agenda:', error);
      throw error;
    }

    this.processarEAtualizarConsultas(data);
    this.iniciarEscutaRealtime(clinicaId); // Inicia WebSocket
  }

  async carregarConsultasDaClinica(force: boolean = false) {
    if (this._consultas().length > 0 && !force) return;
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) return;

    const { data, error } = await this.supabase
      .from('consultas')
      .select(
        `
        id, status, data_consulta, pet_id, veterinario_id, atualizado_em, sintomas,
        pets ( nome, especie, raca, perfis ( nome_completo ) ),
        equipe_clinica ( perfis ( nome_completo ) ),
        servicos_clinica ( nome, valor )
      `, // Retorna o objeto completo do serviço com nome e valor
      )
      .eq('clinica_id', clinicaId)
      .order('data_consulta', { ascending: true });

    if (error) throw error;
    this.processarEAtualizarConsultas(data);
    this.iniciarEscutaRealtime(clinicaId); // Inicia WebSocket
  }

  // ==========================================
  // WEBSOCKET REALTIME
  // ==========================================
  private iniciarEscutaRealtime(clinicaId: string) {
    if (this.realtimeChannel) return; // Evita múltiplas conexões

    this.realtimeChannel = this.supabase
      .channel('public:consultas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultas', filter: `clinica_id=eq.${clinicaId}` },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            this._consultas.update((consultas) =>
              consultas.map((c) =>
                c.id === payload.new['id'] ? { ...c, status: payload.new['status'] } : c,
              ),
            );
          } else if (payload.eventType === 'INSERT') {
            // Busca os dados completos da nova consulta para trazer os JOINs de pet, tutor e serviço completo
            const { data } = await this.supabase
              .from('consultas')
              .select(
                `
                id, status, data_consulta, pet_id, veterinario_id, atualizado_em, sintomas,
                pets ( nome, especie, raca, perfis ( nome_completo ) ),
                equipe_clinica ( perfis ( nome_completo ) ),
                servicos_clinica ( nome, valor )
              `,
              )
              .eq('id', payload.new['id'])
              .single();

            if (data) {
              const novaConsulta = this.formatarConsultaUnica(data);
              this._consultas.update((consultas) => [...consultas, novaConsulta]);
            }
          } else if (payload.eventType === 'DELETE') {
            this._consultas.update((consultas) =>
              consultas.filter((c) => c.id !== payload.old['id']),
            );
          }
        },
      )
      .subscribe();

    // Limpa a conexão se o serviço for destruído
    this.destroyRef.onDestroy(() => {
      this.supabase.removeChannel(this.realtimeChannel);
    });
  }

  // Refatorado para ser reaproveitado pelo WebSocket e pelo carregamento inicial
  private processarEAtualizarConsultas(data: any[]) {
    const consultasFormatadas: ConsultaView[] = data.map((item: any) =>
      this.formatarConsultaUnica(item),
    );
    this._consultas.set(consultasFormatadas);
  }

  private formatarConsultaUnica(item: any): ConsultaView {
    const dataObj = new Date(item.data_consulta);
    const atualizadoEm = item.atualizado_em ? new Date(item.atualizado_em) : null;

    return {
      id: item.id,
      status: item.status as StatusConsulta,
      data_completa: dataObj,
      horario: dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      pet: item.pets?.nome || 'Desconhecido',
      pet_id: item.pet_id,
      especie: item.pets?.especie || 'Outro',
      raca: item.pets?.raca || null,
      tutor: item.pets?.perfis?.nome_completo || 'Sem tutor vinculado',
      veterinario: item.equipe_clinica?.perfis?.nome_completo,
      veterinario_id: item.veterinario_id ?? null,
      atualizado_em: atualizadoEm,
      servico: item.servicos_clinica?.nome || 'Consulta',
      valor_servico: item.servicos_clinica?.valor || 0,
      sintomas: item.sintomas ?? null,
    };
  }

  async agendarConsulta(dados: {
    petId: string;
    veterinarioId: string | null;
    servicoId: string;
    dataHora: string;
    sintomas: string;
    status: StatusConsulta;
  }) {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa selecionada.');

    const payload: any = {
      clinica_id: clinicaId,
      pet_id: dados.petId,
      status: dados.status,
      data_consulta: dados.dataHora,
      sintomas: dados.sintomas || null,
      veterinario_id: dados.veterinarioId || null,
      servico_id: dados.servicoId, // Chave estrangeira que conecta ao registro correspondente
    };

    const { error } = await this.supabase.from('consultas').insert(payload);
    if (error) throw error;
  }

  public aplicarStatusLocal(consultaId: string, novoStatus: StatusConsulta): void {
    this._consultas.update((consultas) =>
      consultas.map((c) => (c.id === consultaId ? { ...c, status: novoStatus } : c)),
    );
  }

  async atualizarStatus(consultaId: string, novoStatus: StatusConsulta) {
    const statusAnterior = this._consultas().find((c) => c.id === consultaId)?.status;

    this.aplicarStatusLocal(consultaId, novoStatus);

    const { error } = await this.supabase
      .from('consultas')
      .update({ status: novoStatus })
      .eq('id', consultaId);

    if (error) {
      if (statusAnterior) {
        this.aplicarStatusLocal(consultaId, statusAnterior);
      }
      throw error;
    }
  }

  async confirmarChegadaNaFila(consultaId: string): Promise<void> {
    const consulta = this._consultas().find((c) => c.id === consultaId);
    if (!consulta || consulta.status !== 'agendada') {
      throw new Error('Consulta não está agendada.');
    }

    const statusAnterior = consulta.status;
    const atualizadoAnterior = consulta.atualizado_em;
    const agora = new Date();

    this._consultas.update((consultas) =>
      consultas.map((c) =>
        c.id === consultaId ? { ...c, status: 'aguardando', atualizado_em: agora } : c,
      ),
    );

    const { error } = await this.supabase
      .from('consultas')
      .update({ status: 'aguardando', atualizado_em: agora.toISOString() })
      .eq('id', consultaId);

    if (error) {
      this._consultas.update((consultas) =>
        consultas.map((c) =>
          c.id === consultaId
            ? { ...c, status: statusAnterior, atualizado_em: atualizadoAnterior }
            : c,
        ),
      );
      throw error;
    }
  }

  public async salvarProntuario(payload: any): Promise<void> {
    const { error } = await this.supabase.rpc('finalizar_atendimento', {
      p_consulta_id: payload.idConsulta,
      p_peso: payload.sinaisVitais.peso,
      p_temperatura: payload.sinaisVitais.temperatura,
      p_sintomas: payload.avaliacao.sintomas,
      p_diagnostico: payload.avaliacao.diagnostico,
      p_notas_privadas: payload.avaliacao.notasPrivadas,
      p_receituario: payload.receituario,
    });

    if (error) throw error;
  }

  async carregarConsultasTutor(forceReload = false): Promise<void> {
    if (!forceReload && this._consultasTutorLoaded()) {
      return;
    }

    const { data, error } = await this.supabase
      .from('vw_minhas_consultas_tutor')
      .select('id, status, sintomas, resumo_publico, data, hora, pet, vet');

    if (error) throw error;

    const consultas = (data ?? []).map((row) =>
      this.normalizarConsultaTutor(row as ConsultaTutorRow),
    );
    this._consultasTutor.set(consultas);
    this._consultasTutorLoaded.set(true);
  }

  private normalizarConsultaTutor(row: ConsultaTutorRow): ConsultaTutorView {
    return {
      id: row.id,
      status: this.rotuloStatusTutor(row.status),
      sintomas: row.sintomas?.trim() || 'Não informado',
      resumo_publico: row.resumo_publico,
      data: this.formatarDataConsulta(row.data),
      hora: this.formatarHoraConsulta(row.hora),
      pet: row.pet,
      vet: row.vet?.trim() || 'Veterinário não informado',
    };
  }

  private rotuloStatusTutor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'agendada':
      case 'aguardando':
        return 'Agendada';
      case 'finalizada':
        return 'Concluída';
      case 'em_andamento':
        return 'Em Andamento';
      case 'aguardando_pagamento':
        return 'Aguardando Pagamento';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  }

  private formatarDataConsulta(valor: string): string {
    const dataObj = new Date(valor);
    if (Number.isNaN(dataObj.getTime())) return valor;
    return dataObj.toLocaleDateString('pt-BR');
  }

  private formatarHoraConsulta(valor: string): string {
    if (/^\d{2}:\d{2}$/.test(valor)) return valor;

    const dataObj = new Date(valor);
    if (Number.isNaN(dataObj.getTime())) return valor;

    return dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  private definirCorPorStatus(status: StatusConsulta) {
    switch (status) {
      case 'agendada':
        return { primary: '#0da193', secondary: '#ccfbf1' };
      case 'em_andamento':
        return { primary: '#f59e0b', secondary: '#fef3c7' };
      case 'aguardando_pagamento':
        return { primary: '#8b5cf6', secondary: '#ede9fe' };
      case 'finalizada':
        return { primary: '#10b981', secondary: '#d1fae5' };
      case 'cancelada':
        return { primary: '#ef4444', secondary: '#fee2e2' };
      default:
        return { primary: '#6b7280', secondary: '#f3f4f6' };
    }
  }
}
