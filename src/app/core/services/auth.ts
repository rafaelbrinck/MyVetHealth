import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { ClinicaService } from './clinica.service';
import { PapelEquipe } from '../models/clinica.model';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private clinicaService = inject(ClinicaService);
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;

  private currentUser = new BehaviorSubject<User | null>(null);
  private userRole = new BehaviorSubject<string | null>(null);

  private sessionPromise: Promise<boolean> | null = null;
  private rolePromise: Promise<string | null> | null = null;
  private roleClinicaIdCache: string | null = null;

  constructor() {
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.next(session?.user ?? null);
      if (!session?.user) {
        this.userRole.next(null);
        this.roleClinicaIdCache = null;
        this.invalidateCaches();
      }
    });

    void this.ensureAuthenticated();
  }

  async ensureAuthenticated(): Promise<boolean> {
    if (this.currentUser.value) {
      return true;
    }

    if (!this.sessionPromise) {
      this.sessionPromise = this.bootstrapSession();
    }

    return this.sessionPromise;
  }

  async ensureRoleForActiveClinic(): Promise<string | null> {
    const autenticado = await this.ensureAuthenticated();
    if (!autenticado) {
      return null;
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      return null;
    }

    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) {
      await this.carregarRoleGlobal(userId);
      return this.userRole.value;
    }

    if (this.userRole.value && this.roleClinicaIdCache === clinicaId) {
      return this.userRole.value;
    }

    if (!this.rolePromise) {
      this.rolePromise = this.carregarRoleParaClinica(userId, clinicaId).finally(() => {
        this.rolePromise = null;
      });
    }

    return this.rolePromise;
  }

  setPapelWorkspace(papel: PapelEquipe, clinicaId: string): void {
    this.userRole.next(papel);
    this.roleClinicaIdCache = clinicaId;
    this.rolePromise = null;
  }

  setPapelTutor(): void {
    this.userRole.next('tutor');
    this.roleClinicaIdCache = null;
    this.rolePromise = null;
  }

  invalidateCaches(): void {
    this.sessionPromise = null;
    this.rolePromise = null;
  }

  async criarCadastroExpresso(dados: any): Promise<void> {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa no sistema.');

    const payload = {
      clinicaId: clinicaId,
      email: dados.email,
      cpf: dados.cpf,
      nomeTutor: dados.nomeTutor,
      nomePet: dados.nomePet,
      especie: dados.especie,
      raca: dados.raca,
      cor: dados.cor,
      dataNascimento: dados.dataNascimento,
      genero: dados.genero,
      telefone: dados.telefone,
    };

    const { data, error } = await this.supabase.functions.invoke('cadastrar-tutor', {
      body: payload,
    });

    if (error) {
      console.error('Erro na Edge Function:', error);
      throw new Error('Falha de comunicação com o servidor seguro.');
    }

    if (data?.error) {
      if (data.error.includes('already registered')) {
        throw new Error('Este e-mail já possui uma conta no sistema.');
      }
      throw new Error(data.error);
    }
  }

  private async bootstrapSession(): Promise<boolean> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (session?.user) {
      this.currentUser.next(session.user);
      return true;
    }

    this.currentUser.next(null);
    return false;
  }

  private async carregarRoleParaClinica(userId: string, clinicaId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('equipe_clinica')
      .select('papel')
      .eq('perfil_id', userId)
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Erro ao carregar papel da clínica ativa:', error);
      throw error;
    }

    if (data?.papel) {
      this.userRole.next(data.papel);
      this.roleClinicaIdCache = clinicaId;
      return data.papel;
    }

    await this.carregarRoleGlobal(userId);
    return this.userRole.value;
  }

  private async carregarRoleGlobal(userId: string): Promise<void> {
    const [perfilData, equipeData, validConvite] = await Promise.all([
      this.supabase.from('perfis').select('papel').eq('id', userId).maybeSingle(),
      this.supabase
        .from('equipe_clinica')
        .select('papel')
        .eq('perfil_id', userId)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle(),
      this.supabase
        .from('convites_clinica')
        .select('id, papel')
        .eq('perfil_id', userId)
        .eq('status', 'pendente')
        .maybeSingle(),
    ]);

    if (perfilData.error) throw perfilData.error;
    if (equipeData.error) throw equipeData.error;
    if (validConvite.error) throw validConvite.error;

    if (perfilData.data) {
      this.userRole.next(perfilData.data.papel);
    } else if (equipeData.data) {
      this.userRole.next(equipeData.data.papel);
    } else if (validConvite.data) {
      this.userRole.next(validConvite.data.papel);
    } else {
      this.userRole.next('tutor');
    }

    this.roleClinicaIdCache = null;
  }

  getCurrentUser() {
    return this.currentUser.asObservable();
  }

  getUserRole() {
    return this.userRole.asObservable();
  }

  getUserRoleValue(): string | null {
    return this.userRole.value;
  }

  getCurrentUserId(): string | null {
    return this.currentUser.value?.id ?? null;
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    if (data.session?.user) {
      this.currentUser.next(data.session.user);
      this.invalidateCaches();
      await this.carregarRoleGlobal(data.session.user.id);
    }
  }

  async logout() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
    } else {
      this.clinicaService.limparClinicaAtiva();
      this.currentUser.next(null);
      this.userRole.next(null);
      this.roleClinicaIdCache = null;
      this.invalidateCaches();
    }
  }
}
