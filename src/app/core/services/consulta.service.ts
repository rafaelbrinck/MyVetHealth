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
}

@Injectable({
  providedIn: 'root',
})
export class ConsultaService {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService);
  private destroyRef = inject(DestroyRef); // NOVO: Gerenciador de ciclo de vida

  // Estado central
  private _consultas = signal<ConsultaView[]>([]);
  public consultas = this._consultas.asReadonly();

  private realtimeChannel!: RealtimeChannel; // NOVO: Referência do canal WebSocket

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
          consulta.status !== 'cancelada'
        );
      })
      .sort((a, b) => a.data_completa.getTime() - b.data_completa.getTime());
  });

  // Mapeamento reativo para o Angular Calendar
  public eventosCalendario = computed<CalendarEvent[]>(() => {
    return this._consultas().map((consulta) => {
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
        id, status, data_consulta, pet_id,
        pets ( nome, especie, raca, perfis ( nome_completo ) ),
        equipe_clinica ( perfis ( nome_completo ) ) 
      `,
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
    this.iniciarEscutaRealtime(clinicaId); // NOVO: Inicia WebSocket
  }

  async carregarConsultasDaClinica(force: boolean = false) {
    if (this._consultas().length > 0 && !force) return;
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) return;

    const { data, error } = await this.supabase
      .from('consultas')
      .select(
        `
        id, status, data_consulta, pet_id,
        pets ( nome, especie, raca, perfis ( nome_completo ) ),
        equipe_clinica ( perfis ( nome_completo ) ) 
      `,
      )
      .eq('clinica_id', clinicaId)
      .order('data_consulta', { ascending: true });

    if (error) throw error;
    this.processarEAtualizarConsultas(data);
    this.iniciarEscutaRealtime(clinicaId); // NOVO: Inicia WebSocket
  }

  // ==========================================
  // NOVO: WEBSOCKET REALTIME
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
            // Busca os dados completos da nova consulta para trazer os JOINs de pet e tutor
            const { data } = await this.supabase
              .from('consultas')
              .select(
                `
                id, status, data_consulta, pet_id,
                pets ( nome, especie, raca, perfis ( nome_completo ) ),
                equipe_clinica ( perfis ( nome_completo ) ) 
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
    };
  }

  async agendarConsulta(dados: {
    petId: string;
    veterinarioId: string | null;
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
    };

    if (dados.veterinarioId) {
      payload.veterinario_id = dados.veterinarioId;
    }

    const { error } = await this.supabase.from('consultas').insert(payload);
    if (error) throw error;

    // Opcional: Você pode remover essa linha abaixo pois o Realtime fará o papel de atualizar a lista!
    // await this.carregarConsultasDaClinica(true);
  }

  async atualizarStatus(consultaId: string, novoStatus: StatusConsulta) {
    const { error } = await this.supabase
      .from('consultas')
      .update({ status: novoStatus })
      .eq('id', consultaId);

    if (error) throw error;
    // O sinal será atualizado via WebSocket automaticamente após o update no banco!
  }

  private definirCorPorStatus(status: StatusConsulta) {
    switch (status) {
      case 'agendada':
        return { primary: '#0da193', secondary: '#ccfbf1' };
      case 'em_andamento':
        return { primary: '#f59e0b', secondary: '#fef3c7' };
      case 'finalizada':
        return { primary: '#10b981', secondary: '#d1fae5' };
      case 'cancelada':
        return { primary: '#ef4444', secondary: '#fee2e2' };
      default:
        return { primary: '#6b7280', secondary: '#f3f4f6' };
    }
  }
}
