import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';
import { Tutor, papelUsuario } from '../models/tutor.model';
import { RealtimeChannel } from '@supabase/supabase-js';

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

    const tutoresFormatados: Tutor[] = data.map((item: any) => ({
      id: item.id,
      nome: item.nome_completo,
      cpf: item.cpf || '',
      email: item.email || '',
      telefone: item.telefone || '',
      criado_em: new Date(item.criado_em),
      papel: item.papel as papelUsuario,

      pets: item.pets
        ? item.pets.map((pet: any) => ({
            id: pet.id,
            nome: pet.nome,
            especie: pet.especie,
            raca: pet.raca,
            cor: pet.cor,
            data_nascimento: pet.data_nascimento ? new Date(pet.data_nascimento) : undefined,
          }))
        : [],
    }));

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
}
