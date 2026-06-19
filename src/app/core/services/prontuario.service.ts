import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';

export interface ClinicaTutorView {
  id: string;
  nome: string;
  endereco: string;
  logo: string;
}

export interface ProntuarioResumoTutorView {
  id: string;
  clinicaId: string;
  pet: string;
  data: string;
  vet: string;
  motivo: string;
}

export interface ProntuarioDetalheTutorView {
  id: string;
  codigoAutenticidade: string;
  clinica: string;
  data: string;
  hora: string;
  pet: string;
  especie: string;
  vet: string;
  crmv: string;
  peso: string;
  motivo: string;
  anamnese: string;
  exameFisico: string;
  diagnostico: string;
  prescricao: string;
}

interface ReceituarioItem {
  nome: string;
  dosagem: string;
  posologia?: string;
}

interface ResumoConsultaRow {
  id: string;
  clinica_id: string;
  data_resumo: string;
  peso: number | null;
  temperatura: number | null;
  sintomas: string | null;
  diagnostico: string | null;
  receituario: ReceituarioItem[] | null;
  pets: {
    nome: string;
    especie: string;
    raca: string | null;
    tutor_id: string;
  };
  clinicas: {
    nome_fantasia: string;
    logradouro: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
  } | null;
  consultas: {
    equipe_clinica: {
      crmv: string | null;
      perfis: {
        nome_completo: string;
      } | null;
    } | null;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProntuarioService {
  private supabase = inject(SupabaseService).client;

  private _clinicas = signal<ClinicaTutorView[]>([]);
  private _prontuarios = signal<ProntuarioResumoTutorView[]>([]);
  private _registrosBrutos = signal<ResumoConsultaRow[]>([]);
  private _isLoading = signal(false);
  private _tutorIdCache = signal<string | null>(null);

  public clinicas = this._clinicas.asReadonly();
  public prontuarios = this._prontuarios.asReadonly();
  public isLoading = this._isLoading.asReadonly();

  async carregarHistoricoTutor(tutorId: string, forceReload = false): Promise<void> {
    if (!forceReload && this._tutorIdCache() === tutorId && this._prontuarios().length > 0) {
      return;
    }

    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabase
        .from('resumo_consultas')
        .select(
          `
          id,
          clinica_id,
          data_resumo,
          peso,
          temperatura,
          sintomas,
          diagnostico,
          receituario,
          pets!inner (
            nome,
            especie,
            raca,
            tutor_id
          ),
          clinicas (
            nome_fantasia,
            logradouro,
            bairro,
            cidade,
            uf
          ),
          consultas (
            equipe_clinica (
              crmv,
              perfis (
                nome_completo
              )
            )
          )
        `,
        )
        .eq('pets.tutor_id', tutorId)
        .order('data_resumo', { ascending: false });

      if (error) throw error;

      const registros = (data ?? []) as unknown as ResumoConsultaRow[];
      this._registrosBrutos.set(registros);
      this._prontuarios.set(registros.map((r) => this.mapearResumo(r)));
      this._clinicas.set(this.extrairClinicas(registros));
      this._tutorIdCache.set(tutorId);
    } finally {
      this._isLoading.set(false);
    }
  }

  async buscarProntuarioPorId(
    prontuarioId: string,
    tutorId: string,
  ): Promise<ProntuarioDetalheTutorView | null> {
    const cached = this._registrosBrutos().find((r) => r.id === prontuarioId);
    if (cached && cached.pets.tutor_id === tutorId) {
      return this.mapearDetalhe(cached);
    }

    const { data, error } = await this.supabase
      .from('resumo_consultas')
      .select(
        `
        id,
        clinica_id,
        data_resumo,
        peso,
        temperatura,
        sintomas,
        diagnostico,
        receituario,
        pets!inner (
          nome,
          especie,
          raca,
          tutor_id
        ),
        clinicas (
          nome_fantasia,
          logradouro,
          bairro,
          cidade,
          uf
        ),
        consultas (
          equipe_clinica (
            crmv,
            perfis (
              nome_completo
            )
          )
        )
      `,
      )
      .eq('id', prontuarioId)
      .eq('pets.tutor_id', tutorId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const registro = data as unknown as ResumoConsultaRow;
    return this.mapearDetalhe(registro);
  }

  private extrairClinicas(registros: ResumoConsultaRow[]): ClinicaTutorView[] {
    const mapa = new Map<string, ClinicaTutorView>();

    for (const registro of registros) {
      if (mapa.has(registro.clinica_id)) continue;

      const clinica = registro.clinicas;
      const nome = clinica?.nome_fantasia ?? 'Clínica';
      mapa.set(registro.clinica_id, {
        id: registro.clinica_id,
        nome,
        endereco: this.formatarEndereco(clinica),
        logo: nome.charAt(0).toUpperCase(),
      });
    }

    return Array.from(mapa.values());
  }

  private mapearResumo(registro: ResumoConsultaRow): ProntuarioResumoTutorView {
    const dataObj = new Date(registro.data_resumo);
    const vet =
      registro.consultas?.equipe_clinica?.perfis?.nome_completo ?? 'Veterinário não informado';

    return {
      id: registro.id,
      clinicaId: registro.clinica_id,
      pet: registro.pets.nome,
      data: dataObj.toLocaleDateString('pt-BR'),
      vet,
      motivo: registro.sintomas?.trim() || registro.diagnostico?.trim() || 'Atendimento clínico',
    };
  }

  private mapearDetalhe(registro: ResumoConsultaRow): ProntuarioDetalheTutorView {
    const dataObj = new Date(registro.data_resumo);
    const equipe = registro.consultas?.equipe_clinica;
    const vet = equipe?.perfis?.nome_completo ?? 'Veterinário não informado';
    const crmv = equipe?.crmv ? `CRMV ${equipe.crmv}` : 'CRMV não informado';
    const raca = registro.pets.raca ? ` (${registro.pets.raca})` : '';

    return {
      id: registro.id,
      codigoAutenticidade: `PRT-${registro.id.slice(0, 8).toUpperCase()}`,
      clinica: registro.clinicas?.nome_fantasia ?? 'Clínica',
      data: dataObj.toLocaleDateString('pt-BR'),
      hora: dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      pet: registro.pets.nome,
      especie: `${registro.pets.especie}${raca}`,
      vet,
      crmv,
      peso: registro.peso != null ? `${registro.peso} kg` : 'Não informado',
      motivo: registro.sintomas?.trim() || 'Motivo não registrado',
      anamnese: registro.sintomas?.trim() || 'Anamnese não registrada.',
      exameFisico: this.formatarExameFisico(registro.peso, registro.temperatura),
      diagnostico: registro.diagnostico?.trim() || 'Diagnóstico não registrado.',
      prescricao: this.formatarPrescricao(registro.receituario),
    };
  }

  private formatarEndereco(
    clinica: ResumoConsultaRow['clinicas'],
  ): string {
    if (!clinica) return 'Endereço não informado';

    const partes = [clinica.bairro, clinica.cidade, clinica.uf].filter(Boolean);
    if (clinica.logradouro) {
      partes.unshift(clinica.logradouro);
    }

    return partes.length > 0 ? partes.join(', ') : 'Endereço não informado';
  }

  private formatarExameFisico(peso: number | null, temperatura: number | null): string {
    const partes: string[] = [];

    if (peso != null) partes.push(`Peso aferido: ${peso} kg.`);
    if (temperatura != null) partes.push(`Temperatura: ${temperatura} °C.`);

    return partes.length > 0
      ? partes.join(' ')
      : 'Exame físico registrado pelo veterinário responsável.';
  }

  private formatarPrescricao(receituario: ReceituarioItem[] | null): string {
    if (!receituario?.length) {
      return 'Nenhuma prescrição registrada para esta consulta.';
    }

    return receituario
      .map(
        (med, index) =>
          `${index + 1}. ${med.nome} — Dosagem: ${med.dosagem}. Uso: ${med.posologia || 'Conforme orientação veterinária.'}`,
      )
      .join('\n');
  }
}
