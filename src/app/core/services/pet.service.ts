import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { CriarPetDTO, Pet } from '../models/pet.model';

@Injectable({
  providedIn: 'root',
})
export class PetService {
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;

  async getTutors() {
    const { data, error } = await this.supabase.from('pets').select('*');
    if (error) {
      console.error('Erro ao buscar tutores:', error);
      return [];
    }
    return data;
  }

  async addPet(pet: CriarPetDTO) {
    const { data, error } = await this.supabase.from('pets').insert(pet).select().single(); // Retorna a linha completa criada, com ID e Datas do banco

    if (error) {
      console.error('Erro no banco ao adicionar pet:', error);
      throw new Error(error.message);
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
}
