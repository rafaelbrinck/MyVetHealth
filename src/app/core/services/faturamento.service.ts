import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';
import { ConsultaService } from './consulta.service';

export type MetodoPagamento =
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'dinheiro'
  | 'transferencia';

export type StatusFaturamento = 'pago' | 'pendente' | 'cancelado';

export interface PeriodoFiltro {
  mes: number;
  ano: number;
}

export interface FaturamentoMetodoRow {
  id: string;
  faturamento_id: string;
  metodo_pagamento: string;
  valor_pago: number;
}

/** Colunas reais retornadas pelo Supabase (sem alias no .select()). */
interface FaturamentoMetodoDbRow {
  id: string;
  faturamento_id: string;
  metodo: string;
  valor: number;
}

interface FaturamentoDbRow {
  id: string;
  clinica_id: string;
  data_competencia: string;
  descricao: string;
  valor_total: number;
  status_pagamento: StatusFaturamento;
  consulta_id?: string | null;
  faturamento_metodos: FaturamentoMetodoDbRow[] | null;
}

export interface FaturamentoRow {
  id: string;
  clinica_id: string;
  data_faturamento: string;
  descricao: string;
  valor_total: number;
  status: StatusFaturamento;
  consulta_id?: string | null;
  faturamento_metodos: FaturamentoMetodoRow[] | null;
}

export interface FaturamentoDashboardView {
  id: string;
  dataFaturamento: string;
  descricao: string;
  status: StatusFaturamento;
  statusLabel: string;
  metodosPagamento: string;
  valorTotal: number;
  valorTotalFormatado: string;
}

export interface FaturamentoKpisView {
  faturamentoTotal: number;
  faturamentoTotalFormatado: string;
  servicosRealizados: number;
  valoresPendentes: number;
  valoresPendentesFormatado: string;
  metodoMaisUsado: string;
}

export interface MetodoPagamentoPayload {
  metodo: MetodoPagamento;
  valor: number;
}

export interface ProcessarPagamentoPayload {
  consultaId: string;
  valorTotal: number;
  descricao?: string;
  metodos: MetodoPagamentoPayload[];
  tipo: 'receita' | 'despesa';
}

export interface FaturamentoRegistro {
  id: string;
  clinica_id: string;
  consulta_id: string;
  valor_total: number;
  status_pagamento: StatusFaturamento;
  data_competencia?: string;
  descricao?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FaturamentoService {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService);
  private consultaService = inject(ConsultaService);

  private _faturamentoDiaValor = signal(0);
  private _processando = signal(false);
  private _faturamentos = signal<FaturamentoDashboardView[]>([]);
  private _faturamentosBrutos = signal<FaturamentoRow[]>([]);
  private _analiseCarregando = signal(false);
  private _periodoAtual = signal<PeriodoFiltro>(this.periodoAtualPadrao());

  public faturamentoDiaValor = this._faturamentoDiaValor.asReadonly();
  public processando = this._processando.asReadonly();
  public faturamentos = this._faturamentos.asReadonly();
  public analiseCarregando = this._analiseCarregando.asReadonly();
  public periodoAtual = this._periodoAtual.asReadonly();

  public kpis = computed<FaturamentoKpisView>(() => {
    const registros = this._faturamentosBrutos();

    const faturamentoTotal = registros
      .filter((item) => item.status === 'pago')
      .reduce((acc, item) => acc + (item.valor_total ?? 0), 0);

    const valoresPendentes = registros
      .filter((item) => item.status === 'pendente')
      .reduce((acc, item) => acc + (item.valor_total ?? 0), 0);

    return {
      faturamentoTotal,
      faturamentoTotalFormatado: this.formatarMoeda(faturamentoTotal),
      servicosRealizados: registros.length,
      valoresPendentes,
      valoresPendentesFormatado: this.formatarMoeda(valoresPendentes),
      metodoMaisUsado: this.calcularMetodoMaisUsado(registros),
    };
  });

  public faturamentoDiaFormatado = computed(() =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      this._faturamentoDiaValor(),
    ),
  );

  async carregarFaturamentoDoDia(): Promise<void> {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) return;

    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date();
    fimDia.setHours(23, 59, 59, 999);

    const { data, error } = await this.supabase
      .from('faturamento')
      .select('valor_total')
      .eq('clinica_id', clinicaId)
      .eq('status_pagamento', 'pago')
      .gte('data_competencia', inicioDia.toISOString())
      .lte('data_competencia', fimDia.toISOString());

    if (error) throw error;

    const total = (data ?? []).reduce((acc, item) => acc + (item.valor_total ?? 0), 0);
    this._faturamentoDiaValor.set(total);
  }

  async carregarAnaliseFinanceira(periodo: PeriodoFiltro): Promise<void> {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa selecionada.');

    this._analiseCarregando.set(true);
    this._periodoAtual.set(periodo);

    try {
      const { inicio, fim } = this.obterIntervaloPeriodo(periodo);

      const { data, error } = await this.supabase
        .from('faturamento')
        .select(
          `
          id,
          clinica_id,
          data_competencia,
          descricao,
          valor_total,
          status_pagamento,
          consulta_id,
          faturamento_metodos (
            id,
            faturamento_id,
            metodo,
            valor
          )
        `,
        )
        .eq('clinica_id', clinicaId)
        .gte('data_competencia', inicio)
        .lte('data_competencia', fim)
        .order('data_competencia', { ascending: false });

      if (error) throw error;

      const registros = (data ?? []).map((row) =>
        this.normalizarFaturamentoRow(row as FaturamentoDbRow),
      );
      this._faturamentosBrutos.set(registros);
      this._faturamentos.set(registros.map((row) => this.mapearFaturamento(row)));
    } finally {
      this._analiseCarregando.set(false);
    }
  }

  async processarPagamento(payload: ProcessarPagamentoPayload): Promise<FaturamentoRegistro> {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa selecionada.');

    if (!payload.metodos.length) {
      throw new Error('Informe ao menos um método de pagamento.');
    }

    const somaMetodos = payload.metodos.reduce((acc, m) => acc + m.valor, 0);
    if (Math.abs(somaMetodos - payload.valorTotal) > 0.01) {
      throw new Error('A soma dos pagamentos deve ser igual ao valor total da consulta.');
    }

    this._processando.set(true);

    this.consultaService.aplicarStatusLocal(payload.consultaId, 'finalizada');
    this._faturamentoDiaValor.update((v) => v + payload.valorTotal);

    let faturamentoId: string | null = null;

    try {
      const { data: faturamento, error: faturamentoError } = await this.supabase
        .from('faturamento')
        .insert({
          clinica_id: clinicaId,
          consulta_id: payload.consultaId,
          valor_total: payload.valorTotal,
          tipo: payload.tipo,
          status_pagamento: 'pago' satisfies StatusFaturamento,
          data_competencia: new Date().toISOString(),
          descricao: payload.descricao?.trim() || 'Consulta veterinária',
        })
        .select(
          'id, clinica_id, consulta_id, valor_total, status_pagamento, data_competencia, descricao',
        )
        .single();

      if (faturamentoError) throw faturamentoError;
      faturamentoId = faturamento.id;

      const metodosPayload = payload.metodos.map((m) => ({
        faturamento_id: faturamento.id,
        metodo: this.rotuloMetodoPagamento(m.metodo),
        valor: m.valor,
      }));

      const { error: metodosError } = await this.supabase
        .from('faturamento_metodos')
        .insert(metodosPayload);

      if (metodosError) throw metodosError;

      const { error: statusError } = await this.supabase
        .from('consultas')
        .update({ status: 'finalizada' })
        .eq('id', payload.consultaId);

      if (statusError) throw statusError;

      return faturamento as FaturamentoRegistro;
    } catch (error) {
      this.consultaService.aplicarStatusLocal(payload.consultaId, 'aguardando_pagamento');
      this._faturamentoDiaValor.update((v) => v - payload.valorTotal);

      if (faturamentoId) {
        await this.supabase.from('faturamento').delete().eq('id', faturamentoId);
      }

      throw error;
    } finally {
      this._processando.set(false);
    }
  }

  private normalizarFaturamentoRow(row: FaturamentoDbRow): FaturamentoRow {
    return {
      id: row.id,
      clinica_id: row.clinica_id,
      data_faturamento: row.data_competencia,
      descricao: row.descricao,
      valor_total: row.valor_total,
      status: row.status_pagamento,
      consulta_id: row.consulta_id,
      faturamento_metodos: (row.faturamento_metodos ?? []).map((metodo) => ({
        id: metodo.id,
        faturamento_id: metodo.faturamento_id,
        metodo_pagamento: metodo.metodo,
        valor_pago: metodo.valor,
      })),
    };
  }

  private mapearFaturamento(row: FaturamentoRow): FaturamentoDashboardView {
    return {
      id: row.id,
      dataFaturamento: new Date(row.data_faturamento).toLocaleDateString('pt-BR'),
      descricao: row.descricao?.trim() || 'Serviço não informado',
      status: row.status,
      statusLabel: this.rotuloStatus(row.status),
      metodosPagamento: this.extrairMetodosPagamento(row.faturamento_metodos),
      valorTotal: row.valor_total ?? 0,
      valorTotalFormatado: this.formatarMoeda(row.valor_total ?? 0),
    };
  }

  private extrairMetodosPagamento(metodos: FaturamentoMetodoRow[] | null): string {
    if (!metodos?.length) return '—';

    const labels = [...new Set(metodos.map((m) => m.metodo_pagamento.trim()).filter(Boolean))];
    return labels.length ? labels.join(' + ') : '—';
  }

  private calcularMetodoMaisUsado(registros: FaturamentoRow[]): string {
    const contagem = new Map<string, number>();

    for (const registro of registros) {
      for (const metodo of registro.faturamento_metodos ?? []) {
        const label = metodo.metodo_pagamento?.trim();
        if (!label) continue;
        contagem.set(label, (contagem.get(label) ?? 0) + 1);
      }
    }

    if (contagem.size === 0) return '—';

    let metodoMaisUsado = '—';
    let maiorContagem = 0;

    for (const [metodo, count] of contagem) {
      if (count > maiorContagem) {
        maiorContagem = count;
        metodoMaisUsado = metodo;
      }
    }

    return metodoMaisUsado;
  }

  private rotuloStatus(status: StatusFaturamento): string {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  }

  private rotuloMetodoPagamento(metodo: MetodoPagamento): string {
    const mapa: Record<MetodoPagamento, string> = {
      pix: 'PIX',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      dinheiro: 'Dinheiro',
      transferencia: 'Transferência',
    };

    return mapa[metodo];
  }

  private periodoAtualPadrao(): PeriodoFiltro {
    const hoje = new Date();
    return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
  }

  private obterIntervaloPeriodo(periodo: PeriodoFiltro): { inicio: string; fim: string } {
    const inicio = new Date(periodo.ano, periodo.mes - 1, 1);
    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(periodo.ano, periodo.mes, 0);
    fim.setHours(23, 59, 59, 999);

    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }
}
