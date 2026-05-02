import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { SupabaseService } from './supabase';
import { WorkspaceClinica, CriarClinicaDTO, Clinica } from '../models/clinica.model';
import { Auth } from './auth';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class ClinicaService {
  private supabase = inject(SupabaseService).client;
  private destroyRef = inject(DestroyRef); // NOVO

  // Estado da Clínica
  private _clinica = signal<Clinica>({} as Clinica);
  public clinica = this._clinica.asReadonly();

  // Signal para guardar a lista da equipe em memória
  public membrosEquipe = signal<any[]>([]);

  private realtimeEquipeChannel!: RealtimeChannel; // NOVO

  constructor() {
    this.recuperarClinicaDoCache();
  }

  get clinicaAtivaId(): string | null {
    return this._clinica().id || localStorage.getItem('clinica_ativa');
  }

  private async recuperarClinicaDoCache() {
    const clinicaIdSalva = localStorage.getItem('clinica_ativa');
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
    localStorage.setItem('clinica_ativa', clinicaId);
  }

  limparClinicaAtiva() {
    this._clinica.set({} as Clinica);
    localStorage.removeItem('clinica_ativa');
    this.membrosEquipe.set([]);

    // NOVO: Limpa a conexão websocket ao deslogar
    if (this.realtimeEquipeChannel) {
      this.supabase.removeChannel(this.realtimeEquipeChannel);
      this.realtimeEquipeChannel = undefined as any;
    }
  }

  async carregarMembrosEquipe(forceReload = false): Promise<void> {
    if (!forceReload && this.membrosEquipe().length > 0) {
      return;
    }

    const clinicaId = this.clinicaAtivaId;
    if (!clinicaId) return;

    const [equipeRes, convitesRes] = await Promise.all([
      this.supabase
        .from('equipe_clinica')
        .select(`id, papel, crmv, ativo, perfis ( id, nome_completo, email, cpf, telefone )`)
        .eq('clinica_id', clinicaId),
      this.supabase
        .from('convites_clinica')
        .select(
          `id, papel, token, status, perfis:perfis!convites_clinica_perfil_id_fkey ( id, nome_completo, email, cpf, telefone )`,
        )
        .eq('clinica_id', clinicaId)
        .eq('status', 'pendente'),
    ]);

    if (equipeRes.error) throw equipeRes.error;
    if (convitesRes.error) throw convitesRes.error;

    const membrosAtivos = equipeRes.data.map((item: any) => ({
      id: item.id,
      perfil_id: item.perfis?.id,
      nome: item.perfis?.nome_completo || 'Sem Nome',
      email: item.perfis?.email || '',
      telefone: item.perfis?.telefone || '',
      papel: item.papel,
      crmv: item.crmv,
      status: item.ativo ? 'ativo' : 'inativo',
      isConvite: false,
    }));

    const convitesPendentes = convitesRes.data.map((item: any) => ({
      id: item.id,
      perfil_id: item.perfis?.id,
      nome: item.perfis?.nome_completo || 'Pendente',
      email: item.perfis?.email || '',
      telefone: item.perfis?.telefone || '',
      papel: item.papel,
      crmv: '---',
      status: 'pendente',
      token: item.token,
      isConvite: true,
    }));

    const listaUnificada = [...membrosAtivos, ...convitesPendentes].sort((a, b) =>
      a.nome.localeCompare(b.nome),
    );

    this.membrosEquipe.set(listaUnificada);

    // NOVO: Inicia o realtime da equipe após o carregamento inicial
    this.iniciarEscutaEquipe(clinicaId);
  }

  // ==========================================
  // NOVO: WEBSOCKET PARA EQUIPE E CONVITES
  // ==========================================
  private iniciarEscutaEquipe(clinicaId: string) {
    if (this.realtimeEquipeChannel) return;

    // Diferente das consultas, a view de equipe depende de tabelas cruzadas (convites e equipe).
    // A forma mais segura de garantir dados consistentes de equipe é recarregar a lista caso haja mudança.
    this.realtimeEquipeChannel = this.supabase
      .channel('public:equipe')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipe_clinica',
          filter: `clinica_id=eq.${clinicaId}`,
        },
        () => {
          this.carregarMembrosEquipe(true); // Força recarregamento silêncioso
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'convites_clinica',
          filter: `clinica_id=eq.${clinicaId}`,
        },
        () => {
          this.carregarMembrosEquipe(true); // Força recarregamento silêncioso
        },
      )
      .subscribe();

    this.destroyRef.onDestroy(() => {
      this.supabase.removeChannel(this.realtimeEquipeChannel);
    });
  }

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

    const { data, error } = await this.supabase.functions.invoke('cadastrar-membro', {
      body: payload,
    });

    if (error) throw new Error('Falha de comunicação com o servidor.');
    if (data?.error) throw new Error(data.error);

    return data;
  }

  async getClinicasDoUsuario(userId: string): Promise<WorkspaceClinica[]> {
    const { data, error } = await this.supabase
      .from('equipe_clinica')
      .select(`papel, clinicas ( id, nome_fantasia, razao_social )`)
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
    const { data, error } = await this.supabase.rpc('aceitar_convite_clinica', {
      p_token: tokenFormatado,
      p_user_id: userId,
    });

    if (error) {
      throw new Error(error.message);
    }
    return data as string;
  }
}
