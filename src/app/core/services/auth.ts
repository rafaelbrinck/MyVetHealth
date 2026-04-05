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
    const { data, error } = await this.supabase
      .from('perfis') // Ajustado para o nome da tabela que criamos no SQL
      .select('papel')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao carregar role:', error);
      this.userRole.next(null);
      return;
    }

    this.userRole.next(data?.papel || null);
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
