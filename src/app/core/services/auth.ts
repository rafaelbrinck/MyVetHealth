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
    if (session) {
      this.currentUser.next(session.user);
      this.carregarRole(session.user.id);
    }
  }

  private async carregarRole(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao carregar role:', error);
      return;
    }

    this.userRole.next(data?.role || null);
  }

  getCurrentUser() {
    return this.currentUser.asObservable();
  }

  getUserRole() {
    return this.userRole.asObservable();
  }

  async login(email: string, password: string) {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Erro ao fazer login:', error);
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
