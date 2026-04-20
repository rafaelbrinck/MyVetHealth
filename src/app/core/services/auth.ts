import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { BehaviorSubject, map } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { Tutor } from '../models/tutor.model';
import { Pet } from '../models/pet.model';
import { PetService } from './pet.service';
import { ClinicaService } from './clinica.service';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private clinicaService = inject(ClinicaService);
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;

  private currentUser = new BehaviorSubject<User | null>(null);
  private userRole = new BehaviorSubject<string | null>(null);

  constructor() {
    this.carregarSessao();
  }

  async criarCadastroExpresso(dados: any): Promise<void> {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa no sistema.');

    // Preparamos o pacote de dados (Payload)
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
    };

    // Chamamos a Edge Function que está rodando segura na nuvem do Supabase
    const { data, error } = await this.supabase.functions.invoke('cadastrar-tutor', {
      body: payload,
    });

    // Tratamento de erros vindo da Function
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

    // Sucesso! O usuário foi criado, a sessão da recepcionista continua ativa e o banco foi atualizado.
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
    const [equipeData, validConvite] = await Promise.all([
      this.supabase
        .from('equipe_clinica')
        .select('papel')
        .eq('perfil_id', userId)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle(),

      this.supabase
        .from('convites_clinica')
        .select(
          `
          id, papel
        `,
        )
        .eq('perfil_id', userId)
        .eq('status', 'pendente')
        .maybeSingle(),
    ]);

    if (equipeData.error) throw equipeData.error;
    if (validConvite.error) throw validConvite.error;

    if (equipeData.data) {
      // Se achou, o usuário já está vinculado a uma clínica (é admin, vet ou recepcionista)
      this.userRole.next(equipeData.data.papel);
    } else if (validConvite.data) {
      // Se não achou na equipe, ele é um usuário recém-cadastrado (sem clínica) ou um Tutor
      this.userRole.next(validConvite.data.papel);
    } else {
      this.userRole.next('tutor');
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
      this.clinicaService.limparClinicaAtiva(); // Limpa a clínica ativa e equipe da memória
      this.currentUser.next(null);
      this.userRole.next(null);
    }
  }
}
