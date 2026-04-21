import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';

export type StatusConsulta = 'agendada' | 'em_andamento' | 'finalizada' | 'cancelada';

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

  private _consultas = signal<ConsultaView[]>([]);
  public consultas = this._consultas.asReadonly();

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

  async carregarConsultasDaClinica(force: boolean = false) {
    if (this._consultas().length > 0 && !force) {
      return;
    }
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) return;

    const { data, error } = await this.supabase
      .from('consultas')
      .select(
        `
        id,
        status,
        data_consulta,
        pet_id,
        pets ( nome, especie, raca, perfis ( nome_completo ) ),
        equipe_clinica ( perfis ( nome_completo ) ) 
      `,
      )
      .eq('clinica_id', clinicaId)
      .order('data_consulta', { ascending: true });

    if (error) {
      console.error('Erro ao carregar consultas:', error);
      throw error;
    }

    const consultasFormatadas: ConsultaView[] = data.map((item: any) => {
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
        // Acessamos o nome seguindo o novo caminho:
        veterinario: item.equipe_clinica?.perfis?.nome_completo,
      };
    });

    this._consultas.set(consultasFormatadas);
  }

  async agendarConsulta(dados: {
    petId: string;
    veterinarioId: string | null;
    dataHora: string;
    sintomas: string;
  }) {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa selecionada.');

    const payload: any = {
      clinica_id: clinicaId,
      pet_id: dados.petId,
      status: 'agendada',
      data_consulta: dados.dataHora,
      sintomas: dados.sintomas || null,
    };

    if (dados.veterinarioId) {
      payload.veterinario_id = dados.veterinarioId;
    }

    const { error } = await this.supabase.from('consultas').insert(payload);

    if (error) throw error;

    await this.carregarConsultasDaClinica(true);
  }

  async atualizarStatus(consultaId: string, novoStatus: StatusConsulta) {
    const { error } = await this.supabase
      .from('consultas')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', consultaId);

    if (error) throw error;

    this._consultas.update((consultas) =>
      consultas.map((c) => (c.id === consultaId ? { ...c, status: novoStatus } : c)),
    );
  }
}
