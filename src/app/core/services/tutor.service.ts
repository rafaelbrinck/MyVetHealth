import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';
import { Tutor, papelUsuario } from '../models/tutor.model';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TutorPerfilRow {
  id: string;
  nome_completo: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  papel: string;
  criado_em: string;
  pets: Array<{
    id: string;
    nome: string;
    especie: string;
    raca: string | null;
    cor: string | null;
    data_nascimento: string | null;
  }> | null;
}

export interface TutorPerfilGlobal {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  criado_em: Date;
  papel: papelUsuario;
}

interface PerfilPorCpfRpcRow {
  id: string;
  nome_completo: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  papel: string;
  criado_em: string;
}

@Injectable({
  providedIn: 'root',
})
export class TutorService {
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;
  private clinicaService = inject(ClinicaService);
  private destroyRef = inject(DestroyRef); // NOVO

  public tutores = signal<Tutor[]>([]);
  private realtimeChannel!: RealtimeChannel; // NOVO

  async getTutoresComPets(forceReload = false): Promise<Tutor[]> {
    if (!forceReload && this.tutores().length > 0) {
      return this.tutores();
    }

    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa no sistema.');

    const { data, error } = await this.supabase
      .from('perfis')
      .select(
        `
        id,
        nome_completo,
        cpf,
        email, 
        telefone,
        papel,
        criado_em,
        clientes_clinica!inner ( clinica_id ),
        pets (
          id,
          nome,
          especie,
          raca,
          cor,
          data_nascimento
        )
      `,
      )
      .eq('clientes_clinica.clinica_id', clinicaId)
      .eq('papel', 'tutor')
      .order('nome_completo', { ascending: true });

    if (error) {
      console.error('Erro de performance ao buscar tutores:', error);
      throw error;
    }

    const tutoresFormatados: Tutor[] = (data as TutorPerfilRow[]).map((item) =>
      this.mapearTutorRow(item),
    );

    this.tutores.set(tutoresFormatados);

    // NOVO: Inicia escuta
    this.iniciarEscutaTutores(clinicaId);

    return this.tutores();
  }

  // ==========================================
  // NOVO: WEBSOCKET PARA CLIENTES
  // ==========================================
  private iniciarEscutaTutores(clinicaId: string) {
    if (this.realtimeChannel) return;

    // Como essa view é complexa e junta Perfis e Pets,
    // a estratégia mais segura é recarregar silenciosamente quando algo muda
    // na tabela clientes_clinica ou pets.
    this.realtimeChannel = this.supabase
      .channel('public:tutores_pets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes_clinica',
          filter: `clinica_id=eq.${clinicaId}`,
        },
        () => {
          this.getTutoresComPets(true);
        },
      )
      // Escutando a tabela Pets (como não tem clinica_id lá, escutamos tudo, mas a query do getTutoresComPets já filtra corretamente)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, () => {
        this.getTutoresComPets(true);
      })
      .subscribe();

    this.destroyRef.onDestroy(() => {
      this.supabase.removeChannel(this.realtimeChannel);
    });
  }

  async buscarTutorGlobalPorCPF(cpf: string): Promise<TutorPerfilGlobal | null> {
    const cpfNormalizado = cpf.replace(/\D/g, '');
    if (cpfNormalizado.length < 11) {
      return null;
    }

    const { data, error } = await this.supabase.rpc('buscar_perfil_por_cpf', {
      p_cpf: cpfNormalizado,
    });

    if (error) {
      console.error('[TutorService] Erro na RPC buscar_perfil_por_cpf:', error);
      throw error;
    }

    const perfil = (data as PerfilPorCpfRpcRow[] | null)?.[0];
    if (!perfil) {
      return null;
    }

    return {
      id: perfil.id,
      nome: perfil.nome_completo,
      cpf: perfil.cpf ?? cpfNormalizado,
      email: perfil.email ?? '',
      telefone: perfil.telefone ?? '',
      criado_em: new Date(perfil.criado_em),
      papel: perfil.papel as papelUsuario,
    };
  }

  async vincularTutorAClinica(tutorId: string): Promise<void> {
    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) {
      throw new Error('Nenhuma clínica ativa no sistema.');
    }

    const { data: vinculoExistente, error: consultaError } = await this.supabase
      .from('clientes_clinica')
      .select()
      .eq('clinica_id', clinicaId)
      .eq('tutor_id', tutorId)
      .maybeSingle();

    if (consultaError) {
      console.error('Erro ao verificar vínculo do tutor com a clínica:', consultaError);
      throw consultaError;
    }

    if (vinculoExistente) {
      return;
    }

    const { error } = await this.supabase.from('clientes_clinica').insert({
      clinica_id: clinicaId,
      tutor_id: tutorId,
    });

    if (error) {
      console.error('Erro ao vincular tutor à clínica:', error);
      throw error;
    }
  }

  private mapearTutorRow(item: TutorPerfilRow): Tutor {
    return {
      id: item.id,
      nome: item.nome_completo,
      cpf: item.cpf || '',
      email: item.email || '',
      telefone: item.telefone || '',
      criado_em: new Date(item.criado_em),
      papel: item.papel as papelUsuario,
      pets: item.pets
        ? item.pets.map((pet) => ({
            id: pet.id,
            tutor_id: item.id,
            nome: pet.nome,
            especie: pet.especie,
            raca: pet.raca ?? '',
            cor: pet.cor ?? undefined,
            data_nascimento: pet.data_nascimento ? new Date(pet.data_nascimento) : undefined,
            peso_atual: 0,
            criado_em: new Date(item.criado_em),
          }))
        : [],
    };
  }
}
