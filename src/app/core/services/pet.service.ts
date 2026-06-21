import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase'; // Ajuste o caminho se necessário
import { CriarPetDTO, Pet } from '../models/pet.model'; // Ajuste o caminho se necessário

export interface ReceituarioItemHistorico {
  nome: string;
  dosagem: string;
  posologia?: string;
}

export interface ConsultaTutorHistorico {
  id: string;
  clinica_id?: string;
  data_resumo: string;
  peso: number;
  temperatura: number;
  sintomas: string;
  diagnostico: string;
  receituario: ReceituarioItemHistorico[];
  clinica?: { nome_fantasia: string };
}

interface HistoricoPetRow {
  id: string;
  clinica_id: string;
  data_resumo: string;
  peso: number | null;
  temperatura: number | null;
  sintomas: string | null;
  diagnostico: string | null;
  receituario: ReceituarioItemHistorico[] | null;
  clinica: { nome_fantasia: string } | null;
}

@Injectable({
  providedIn: 'root',
})
export class PetService {
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;

  // Estado global reativo dos pets
  public meusPets = signal<any[]>([]);
  public isPetsLoaded = signal(false);

  // Busca os pets e salva no estado global (com controle de cache)
  async carregarPetsDoTutor(idTutor: string, forceReload = false) {
    if (this.isPetsLoaded() && !forceReload) {
      return; // Já temos os dados em memória, evita bater no banco à toa
    }

    const { data, error } = await this.supabase.from('pets').select('*').eq('tutor_id', idTutor);

    if (error) {
      console.error('Erro ao buscar pets do tutor:', error);
      return;
    }

    // Fallback visual para garantir que a UI não quebre
    const petsMapeados = data.map((pet: any) => ({
      ...pet,
      foto: pet.foto || (pet.especie?.toLowerCase() === 'gato' ? '🐈' : '🐕'),
      status: pet.status || 'Saudável',
      proximaVacina: pet.proximaVacina || 'A definir',
    }));

    this.meusPets.set(petsMapeados);
    this.isPetsLoaded.set(true);
  }

  async addPet(pet: CriarPetDTO) {
    const { data, error } = await this.supabase.from('pets').insert(pet).select().single();

    if (error) {
      console.error('Erro no banco ao adicionar pet:', error);
      throw new Error(error.message);
    }

    // Atualização otimista: injeta no Signal para atualizar todas as telas automaticamente
    let fotoEmoji = '🐾';
    if (pet.especie?.toLowerCase() === 'cachorro') fotoEmoji = '🐕';
    if (pet.especie?.toLowerCase() === 'gato') fotoEmoji = '🐈';

    const petParaExibicao = {
      ...data,
      foto: fotoEmoji,
      proximaVacina: 'A definir',
      status: 'Saudável',
    };

    this.meusPets.update((lista) => [...lista, petParaExibicao]);

    return data;
  }

  async getTutors() {
    const { data, error } = await this.supabase.from('pets').select('*');
    if (error) {
      console.error('Erro ao buscar tutores:', error);
      return [];
    }
    return data;
  }

  async updatePet(id: number, pet: Partial<Pet>) {
    const { data, error } = await this.supabase
      .from('pets')
      .update(pet)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Erro ao atualizar pet:', error);
      return null;
    }
    return data;
  }

  // Mantido para retrocompatibilidade caso alguma tela antiga use diretamente
  async getPetTutor(idTutor: string) {
    const { data, error } = await this.supabase.from('pets').select('*').eq('tutor_id', idTutor);
    if (error) {
      console.error('Erro ao buscar pets do tutor:', error);
      return [];
    }
    return data;
  }

  async carregarHistoricoMedicoPet(petId: string): Promise<ConsultaTutorHistorico[]> {
    const { data, error } = await this.supabase
      .from('resumo_consultas')
      .select(
        `
        id,
        clinica_id,
        data_resumo,
        peso,
        temperatura,
        sintomas,
        diagnostico,
        receituario,
        clinica:clinicas(nome_fantasia)
      `,
      )
      .eq('pet_id', petId)
      .order('data_resumo', { ascending: false });

    if (error) {
      console.error('Erro ao carregar histórico médico do pet:', error);
      throw error;
    }

    return ((data ?? []) as unknown as HistoricoPetRow[]).map((item) => ({
      id: item.id,
      clinica_id: item.clinica_id,
      data_resumo: item.data_resumo,
      peso: item.peso ?? 0,
      temperatura: item.temperatura ?? 0,
      sintomas: item.sintomas ?? '',
      diagnostico: item.diagnostico ?? '',
      receituario: item.receituario ?? [],
      clinica: item.clinica ? { nome_fantasia: item.clinica.nome_fantasia } : undefined,
    }));
  }
}
