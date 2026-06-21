import { Injectable, computed, inject, signal } from '@angular/core';
import { Auth } from './auth';
import { ClinicaService } from './clinica.service';
import { ConsultaService, ConsultaView, StatusConsulta } from './consulta.service';
import { PapelEquipe } from '../models/clinica.model';

export type UrgenciaAgendamento = 'emergencia' | 'prioridade' | 'normal';

export interface FilaConsultaItem {
  id: string;
  petNome: string;
  tutorNome: string;
  horarioAgendado: string;
  urgencia: UrgenciaAgendamento;
  status: StatusConsulta;
  horaCheckin: Date | null;
  dataAgendamento: Date;
  veterinarioId: string | null;
  veterinarioNome?: string;
  especie: string;
  servico?: string;
}

export interface FilaMetricas {
  totalAguardando: number;
  totalAgendados: number;
  tempoMedioEsperaMinutos: number;
  consultasAtivas: number;
}

const URGENCIA_PESO: Record<UrgenciaAgendamento, number> = {
  emergencia: 0,
  prioridade: 1,
  normal: 2,
};

const STATUS_FILA_OPERACIONAL: StatusConsulta[] = ['agendada', 'aguardando', 'em_andamento'];

@Injectable({
  providedIn: 'root',
})
export class FilaService {
  private consultaService = inject(ConsultaService);
  private clinicaService = inject(ClinicaService);
  private auth = inject(Auth);

  private _carregando = signal(false);
  private _erro = signal<string | null>(null);

  public carregando = this._carregando.asReadonly();
  public erro = this._erro.asReadonly();

  private consultasDoDia = computed(() => {
    const hoje = new Date();
    return this.consultaService
      .consultas()
      .filter((consulta) => this.ehHoje(consulta.data_completa, hoje))
      .filter((consulta) => STATUS_FILA_OPERACIONAL.includes(consulta.status))
      .map((consulta) => this.mapearConsultaParaFila(consulta));
  });

  private consultasVisiveis = computed(() => {
    const itens = this.consultasDoDia();
    const papel = this.auth.getUserRoleValue() as PapelEquipe | null;

    if (papel !== 'veterinario') {
      return itens;
    }

    const equipeVetId = this.obterEquipeVeterinarioId();
    if (!equipeVetId) return itens;

    return itens.filter(
      (item) => item.veterinarioId === null || item.veterinarioId === equipeVetId,
    );
  });

  public filaAguardando = computed(() =>
    this.consultasVisiveis()
      .filter((item) => item.status === 'aguardando')
      .sort((a, b) => this.ordenarFila(a, b)),
  );

  public consultasAgendadas = computed(() =>
    this.consultasVisiveis()
      .filter((item) => item.status === 'agendada')
      .sort((a, b) => a.dataAgendamento.getTime() - b.dataAgendamento.getTime()),
  );

  public consultasAtivas = computed(() =>
    this.consultasVisiveis().filter((item) => item.status === 'em_andamento'),
  );

  public metricas = computed<FilaMetricas>(() => {
    const naFila = this.filaAguardando();
    const referencia = new Date();
    const tempos = naFila.map((item) => this.calcularMinutosEspera(item, referencia));

    const tempoMedio =
      tempos.length > 0 ? Math.round(tempos.reduce((acc, min) => acc + min, 0) / tempos.length) : 0;

    return {
      totalAguardando: naFila.length,
      totalAgendados: this.consultasAgendadas().length,
      tempoMedioEsperaMinutos: tempoMedio,
      consultasAtivas: this.consultasAtivas().length,
    };
  });

  calcularMinutosEspera(item: FilaConsultaItem, referencia: Date): number {
    const inicio = item.horaCheckin ?? item.dataAgendamento;
    const diffMs = referencia.getTime() - inicio.getTime();
    return Math.max(0, Math.floor(diffMs / 60_000));
  }

  async carregarFilaDoDia(forceReload = false): Promise<void> {
    if (this._carregando()) return;

    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) {
      this._erro.set('Nenhuma clínica ativa selecionada.');
      return;
    }

    this._carregando.set(true);
    this._erro.set(null);

    try {
      const papel = this.auth.getUserRoleValue() as PapelEquipe | null;

      if (papel === 'veterinario') {
        await this.clinicaService.carregarMembrosEquipe(forceReload);
      }

      await this.consultaService.carregarConsultasDaClinica(forceReload);
    } catch (err) {
      console.error('[FilaService] Falha ao carregar fila', err);
      this._erro.set('Não foi possível carregar a fila de consultas.');
    } finally {
      this._carregando.set(false);
    }
  }

  async iniciarAtendimento(consultaId: string): Promise<void> {
    await this.consultaService.atualizarStatus(consultaId, 'em_andamento');
  }

  async confirmarChegadaNaFila(consultaId: string): Promise<void> {
    await this.consultaService.confirmarChegadaNaFila(consultaId);
  }

  private mapearConsultaParaFila(consulta: ConsultaView): FilaConsultaItem {
    const horaCheckin =
      consulta.status === 'aguardando' && consulta.atualizado_em
        ? consulta.atualizado_em
        : consulta.status === 'aguardando'
          ? consulta.data_completa
          : null;

    return {
      id: consulta.id,
      petNome: consulta.pet,
      tutorNome: consulta.tutor,
      horarioAgendado: consulta.horario,
      urgencia: this.inferirUrgencia(consulta, horaCheckin),
      status: consulta.status,
      horaCheckin,
      dataAgendamento: consulta.data_completa,
      veterinarioId: consulta.veterinario_id,
      veterinarioNome: consulta.veterinario,
      especie: consulta.especie,
      servico: consulta.servico,
    };
  }

  private inferirUrgencia(consulta: ConsultaView, horaCheckin: Date | null): UrgenciaAgendamento {
    if (consulta.status !== 'aguardando' && consulta.status !== 'agendada') {
      return 'normal';
    }

    const minutos = this.calcularMinutosEspera(
      {
        id: consulta.id,
        petNome: consulta.pet,
        tutorNome: consulta.tutor,
        horarioAgendado: consulta.horario,
        urgencia: 'normal',
        status: consulta.status,
        horaCheckin,
        dataAgendamento: consulta.data_completa,
        veterinarioId: consulta.veterinario_id,
        especie: consulta.especie,
      },
      new Date(),
    );

    if (minutos >= 45) return 'emergencia';
    if (minutos >= 20) return 'prioridade';
    return 'normal';
  }

  private ordenarFila(a: FilaConsultaItem, b: FilaConsultaItem): number {
    const urgenciaDiff = URGENCIA_PESO[a.urgencia] - URGENCIA_PESO[b.urgencia];
    if (urgenciaDiff !== 0) return urgenciaDiff;

    const esperaA = this.calcularMinutosEspera(a, new Date());
    const esperaB = this.calcularMinutosEspera(b, new Date());
    return esperaB - esperaA;
  }

  private ehHoje(data: Date, referencia: Date): boolean {
    return (
      data.getDate() === referencia.getDate() &&
      data.getMonth() === referencia.getMonth() &&
      data.getFullYear() === referencia.getFullYear()
    );
  }

  private obterEquipeVeterinarioId(): string | null {
    const perfilId = this.auth.getCurrentUserId();
    if (!perfilId) return null;

    const membro = this.clinicaService
      .membrosEquipe()
      .find(
        (item) =>
          item.perfil_id === perfilId && item.papel === 'veterinario' && item.status === 'ativo',
      );

    return membro?.id ?? null;
  }
}
