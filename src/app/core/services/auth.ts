import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;

  private currentUser = new BehaviorSubject<User | null>(null);
  private userRole = new BehaviorSubject<string | null>(null);

  constructor() {
    this.carregarSessao();
  }

  private async carregarSessao() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (session?.user) {
      this.currentUser.next(session.user);
      await this.carregarRole(session.user.id);
    }
  }

  private async carregarRole(userId: string) {
    // Agora o papel não fica mais no perfil.
    // Vamos buscar se esse usuário faz parte de alguma clínica.
    const { data, error } = await this.supabase
      .from('equipe_clinica')
      .select('papel')
      .eq('perfil_id', userId)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle(); // maybeSingle é perfeito aqui: se não achar nada, ele retorna null em vez de dar erro.

    if (error) {
      console.error('Erro ao carregar role da equipe:', error);
      this.userRole.next(null);
      return;
    }

    if (data) {
      // Se achou, o usuário já está vinculado a uma clínica (é admin, vet ou recepcionista)
      this.userRole.next(data.papel);
    } else {
      // Se não achou na equipe, ele é um usuário recém-cadastrado (sem clínica) ou um Tutor
      this.userRole.next('sem_vinculo');
    }
  }

  getCurrentUser() {
    return this.currentUser.asObservable();
  }

  getUserRole() {
    return this.userRole.asObservable();
  }

  // Novo método para pegar o valor atual instantaneamente sem Observables
  getUserRoleValue(): string | null {
    return this.userRole.value;
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw error; // Joga o erro para o catch() do login.ts interceptar
    }

    // Se logou com sucesso, já atualiza as variáveis e busca a role aguardando terminar
    if (data.session?.user) {
      this.currentUser.next(data.session.user);
      await this.carregarRole(data.session.user.id);
    }
  }

  async logout() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
    } else {
      this.currentUser.next(null);
      this.userRole.next(null);
    }
  }
}
