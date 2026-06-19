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

export type StatusPagamento = 'pago' | 'pendente' | 'cancelado';

export interface MetodoPagamentoPayload {
  metodo: MetodoPagamento;
  valor: number;
}

export interface ProcessarPagamentoPayload {
  consultaId: string;
  valorTotal: number;
  metodos: MetodoPagamentoPayload[];
}

export interface FaturamentoRegistro {
  id: string;
  clinica_id: string;
  consulta_id: string;
  valor_total: number;
  status_pagamento: StatusPagamento;
  criado_em?: string;
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

  public faturamentoDiaValor = this._faturamentoDiaValor.asReadonly();
  public processando = this._processando.asReadonly();

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
      .gte('criado_em', inicioDia.toISOString())
      .lte('criado_em', fimDia.toISOString());

    if (error) throw error;

    const total = (data ?? []).reduce((acc, item) => acc + (item.valor_total ?? 0), 0);
    this._faturamentoDiaValor.set(total);
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
          status_pagamento: 'pago' satisfies StatusPagamento,
        })
        .select('id, clinica_id, consulta_id, valor_total, status_pagamento, criado_em')
        .single();

      if (faturamentoError) throw faturamentoError;
      faturamentoId = faturamento.id;

      const metodosPayload = payload.metodos.map((m) => ({
        faturamento_id: faturamento.id,
        metodo: m.metodo,
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
}
