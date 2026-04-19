import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { WorkspaceClinica, CriarClinicaDTO, Clinica } from '../models/clinica.model'; // Ajuste o caminho se necessário
import { Auth } from './auth';

@Injectable({
  providedIn: 'root',
})
export class ClinicaService {
  private supabase = inject(SupabaseService).client;
  // Estado da Clínica
  private _clinica = signal<Clinica>({} as Clinica);
  public clinica = this._clinica.asReadonly();

  // NOVO: Signal para guardar a lista da equipe em memória (Alta Performance)
  public membrosEquipe = signal<any[]>([]);

  constructor() {
    // 1. AUTO-HIDRATAÇÃO
    // Toda vez que o serviço é construído (ex: usuário deu F5),
    // ele tenta recuperar a clínica silenciosamente.
    this.recuperarClinicaDoCache();
  }

  // ==========================================
  // O GETTER SEGURO DE ID
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

    // SALVA NO CACHE SEMPRE QUE SETAR
    localStorage.setItem('clinica_ativa', clinicaId);
  }

  // LIMPEZA (Chame isso no método de Logout do seu sistema)
  limparClinicaAtiva() {
    this._clinica.set({} as Clinica);
    localStorage.removeItem('clinica_ativa');
    this.membrosEquipe.set([]); // NOVO: Limpa a equipe da memória ao deslogar
  }

  // ==========================================
  // NOVOS MÉTODOS: GESTÃO DE EQUIPE
  // ==========================================

  // 1. Carrega a lista real do banco fazendo JOIN
  async carregarMembrosEquipe(forceReload = false): Promise<void> {
    if (!forceReload && this.membrosEquipe().length > 0) {
      return;
    }

    const clinicaId = this.clinicaAtivaId;
    if (!clinicaId) return;

    // DISPARO PARALELO: Busca as duas tabelas ao mesmo tempo
    const [equipeRes, convitesRes] = await Promise.all([
      // Consulta 1: Membros Ativos
      this.supabase
        .from('equipe_clinica')
        .select(
          `
          id, papel, crmv, ativo,
          perfis ( id, nome_completo, email, cpf, telefone )
        `,
        )
        .eq('clinica_id', clinicaId),

      // Consulta 2: Convites Pendentes
      this.supabase
        .from('convites_clinica')
        .select(
          `
          id, papel, token, status,
          perfis:perfis!convites_clinica_perfil_id_fkey ( id, nome_completo, email, cpf, telefone )
        `,
        )
        .eq('clinica_id', clinicaId)
        .eq('status', 'pendente'),
    ]);

    if (equipeRes.error) throw equipeRes.error;
    if (convitesRes.error) throw convitesRes.error;

    // MAPEAMENTO 1: Membros já vinculados
    const membrosAtivos = equipeRes.data.map((item: any) => ({
      id: item.id,
      perfil_id: item.perfis?.id,
      nome: item.perfis?.nome_completo || 'Sem Nome',
      email: item.perfis?.email || '',
      telefone: item.perfis?.telefone || '',
      papel: item.papel,
      crmv: item.crmv,
      status: item.ativo ? 'ativo' : 'inativo', // Status baseado na coluna ativo
      isConvite: false,
    }));

    // MAPEAMENTO 2: Convites que ainda não foram aceitos
    const convitesPendentes = convitesRes.data.map((item: any) => ({
      id: item.id,
      perfil_id: item.perfis?.id,
      nome: item.perfis?.nome_completo || 'Pendente',
      email: item.perfis?.email || '',
      telefone: item.perfis?.telefone || '',
      papel: item.papel,
      crmv: '---',
      status: 'pendente', // Status fixo como pendente
      token: item.token,
      isConvite: true,
    }));

    // UNIFICAÇÃO: Junta as duas listas e ordena por nome
    const listaUnificada = [...membrosAtivos, ...convitesPendentes].sort((a, b) =>
      a.nome.localeCompare(b.nome),
    );

    this.membrosEquipe.set(listaUnificada);
  }

  // 2. Envia os dados para a Edge Function de cadastro/convite
  async cadastrarMembroEquipe(
    dadosMembro: any,
  ): Promise<{ acao: string; mensagem: string; token?: string }> {
    const clinicaId = this.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa selecionada.');

    const { data: userData } = await this.supabase.auth.getUser();
    const adminId = userData.user?.id;

    const payload = {
      clinicaId,
      adminId,
      email: dadosMembro.email,
      cpf: dadosMembro.cpf,
      nome: dadosMembro.nome,
      telefone: dadosMembro.telefone,
      papelEquipe: dadosMembro.papel,
      crmv: dadosMembro.crmv,
    };

    // Invoca a função segura na nuvem
    const { data, error } = await this.supabase.functions.invoke('cadastrar-membro', {
      body: payload,
    });

    if (error) throw new Error('Falha de comunicação com o servidor.');
    if (data?.error) throw new Error(data.error);

    return data;
  }

  // ==========================================
  // MÉTODOS ANTIGOS DE WORKSPACE
  // ==========================================

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
    // Chamada única ao banco - Máxima economia de recursos e latência
    const { data, error } = await this.supabase.rpc('aceitar_convite_clinica', {
      p_token: tokenFormatado,
      p_user_id: userId,
    });

    if (error) {
      // O erro levantado pelo RAISE EXCEPTION no Postgres vem parar aqui
      throw new Error(error.message);
    }

    // Retorna o clinica_id (UUID)
    return data as string;
  }
}
