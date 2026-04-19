import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { WorkspaceClinica, CriarClinicaDTO, Clinica } from '../models/clinica.model'; // Ajuste o caminho

@Injectable({
  providedIn: 'root',
})
export class ClinicaService {
  private supabase = inject(SupabaseService).client;

  private _clinica = signal<Clinica>({} as Clinica);
  public clinica = this._clinica.asReadonly();

  constructor() {
    // 1. AUTO-HIDRATAÇÃO
    // Toda vez que o serviço é construído (ex: usuário deu F5), 
    // ele tenta recuperar a clínica silenciosamente.
    this.recuperarClinicaDoCache();
  }

  // ==========================================
  // 2. O GETTER SEGURO DE ID
  // ==========================================
  // Ele tenta ler do Signal. Se estiver vazio (porque o Supabase ainda está carregando), 
  // ele lê instantaneamente do cache do navegador.
  get clinicaAtivaId(): string | null {
    return this._clinica().id || localStorage.getItem('clinica_ativa');
  }

  private async recuperarClinicaDoCache() {
    const clinicaIdSalva = localStorage.getItem('clinica_ativa');
    
    // Só busca no banco se tiver ID no cache e o Signal estiver vazio
    if (clinicaIdSalva && !this._clinica().id) {
      try {
        await this.setarClinicaAtiva(clinicaIdSalva);
      } catch (error) {
        console.error('Falha ao restaurar a clínica da sessão:', error);
      }
    }
  }

  async setarClinicaAtiva(clinicaId: string) {
    const { data, error } = await this.supabase
      .from('clinicas')
      .select('*')
      .eq('id', clinicaId)
      .single();

    if (error) {
      console.error('Erro ao buscar clínica:', error);
      throw new Error('Não foi possível carregar os dados da clínica. Tente novamente.');
    }
    
    this._clinica.set(data);
    
    // 3. SALVA NO CACHE SEMPRE QUE SETAR
    localStorage.setItem('clinica_ativa', clinicaId);
  }

  // 4. LIMPEZA (Chame isso no método de Logout do seu sistema)
  limparClinicaAtiva() {
    this._clinica.set({} as Clinica);
    localStorage.removeItem('clinica_ativa');
  }

  async getClinicasDoUsuario(userId: string): Promise<WorkspaceClinica[]> {
    const { data, error } = await this.supabase
      .from('equipe_clinica')
      .select(
        `
        papel,
        clinicas ( id, nome_fantasia, razao_social )
      `,
      )
      .eq('perfil_id', userId)
      .eq('ativo', true);

    if (error) throw error;

    const clinicasFormatadas: WorkspaceClinica[] = data.map((item: any) => ({
      id: item.clinicas.id,
      nome: item.clinicas.nome_fantasia,
      razao_social: item.clinicas.razao_social,
      papel: item.papel as WorkspaceClinica['papel'],
    }));

    return clinicasFormatadas;
  }

  async criarClinicaEVincular(userId: string, valoresFormulario: CriarClinicaDTO): Promise<string> {
    const { data: clinica, error: clinicaError } = await this.supabase
      .from('clinicas')
      .insert({
        razao_social: valoresFormulario.razaoSocial,
        nome_fantasia: valoresFormulario.nomeFantasia,
        cnpj: valoresFormulario.cnpj,
        telefone_contato: valoresFormulario.telefone,
        cep: valoresFormulario.cep,
        cidade: valoresFormulario.cidade,
        uf: valoresFormulario.uf?.toUpperCase(),
      })
      .select('id')
      .single();

    if (clinicaError) throw clinicaError;

    const { error: equipeError } = await this.supabase.from('equipe_clinica').insert({
      clinica_id: clinica.id,
      perfil_id: userId,
      papel: 'admin_clinica',
    });

    if (equipeError) {
      console.warn('Erro ao vincular dono. Iniciando rollback da clínica...', equipeError);

      const { error: rollbackError } = await this.supabase
        .from('clinicas')
        .delete()
        .eq('id', clinica.id);

      if (rollbackError) {
        console.error('Falha CRÍTICA no rollback. Clínica fantasma gerada:', clinica.id);
      }

      throw new Error(
        'Ocorreu um problema ao criar seu acesso. O processo foi cancelado por segurança. Tente novamente.',
      );
    }

    return clinica.id;
  }

  async aceitarConvite(userId: string, tokenFormatado: string): Promise<string> {
    const { data: convite, error: buscaError } = await this.supabase
      .from('convites_clinica')
      .select('*')
      .eq('token', tokenFormatado)
      .eq('status', 'pendente')
      .single();

    if (buscaError || !convite) {
      throw new Error('Convite inválido, expirado ou já utilizado.');
    }

    const dataExpiracao = new Date(convite.expira_em);
    if (new Date() > dataExpiracao) {
      await this.supabase
        .from('convites_clinica')
        .update({ status: 'expirado' })
        .eq('id', convite.id);
      throw new Error('Este convite já expirou.');
    }

    const { error: vinculoError } = await this.supabase.from('equipe_clinica').insert({
      clinica_id: convite.clinica_id,
      perfil_id: userId,
      papel: convite.papel,
    });

    if (vinculoError) {
      if (vinculoError.code === '23505') {
        throw new Error('Você já faz parte desta clínica.');
      }
      throw vinculoError;
    }

    const { error: updateError } = await this.supabase
      .from('convites_clinica')
      .update({ status: 'aceito' })
      .eq('id', convite.id);

    if (updateError) throw updateError;

    return convite.clinica_id;
  }
}