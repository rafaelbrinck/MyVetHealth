import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { ClinicaService } from './clinica.service';
import { Tutor, papelUsuario } from '../models/tutor.model';

@Injectable({
  providedIn: 'root',
})
export class TutorService {
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;
  private clinicaService = inject(ClinicaService);

  public tutores = signal<Tutor[]>([]);

  async getTutoresComPets(forceReload = false): Promise<Tutor[]> {
    
    // 1. O CACHE INTELIGENTE (Evita requisições repetidas)
    if (!forceReload && this.tutores().length > 0) {
      return this.tutores(); 
    }

    const clinicaId = this.clinicaService.clinicaAtivaId;
    if (!clinicaId) throw new Error('Nenhuma clínica ativa no sistema.');

    // ==========================================
    // A MÁGICA DA ALTA PERFORMANCE (ÚNICA REQUISIÇÃO)
    // ==========================================
    // Explicando a Query:
    // 1. Busca na tabela 'perfis'
    // 2. clientes_clinica!inner: Filtra APENAS perfis que tenham vínculo com essa clínica.
    // 3. pets(...): Traz todos os pets atrelados a esse tutor e a essa clínica.
    
    const { data, error } = await this.supabase
      .from('perfis')
      .select(`
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
      `)
      .eq('clientes_clinica.clinica_id', clinicaId)
      .eq('papel', 'tutor')
      .order('nome_completo', { ascending: true }); // Ordena por ordem alfabética já no banco

    if (error) {
      console.error('Erro de performance ao buscar tutores:', error);
      throw error;
    }

    // ==========================================
    // CAMADA ANTICORRUPÇÃO (DATA MAPPING)
    // ==========================================
    // Aqui nós "limpamos" o JSON sujo do banco e garantimos 
    // que o componente só receba a Interface estrita que você definiu.

    const tutoresFormatados: Tutor[] = data.map((item: any) => ({
      id: item.id, // Se o seu BD usa UUID, a interface precisa ser string
      nome: item.nome_completo, // O seu "De -> Para" do BD pro Front
      cpf: item.cpf || '',
      email: item.email || '', 
      telefone: item.telefone || '',
      criado_em: new Date(item.criado_em),
      papel: item.papel as papelUsuario,
      
      // O Supabase já devolve um Array de pets perfeitamente aninhado!
      // Se ele não tiver pets, garantimos que devolve um array vazio [] para não quebrar o HTML
      pets: item.pets ? item.pets.map((pet: any) => ({
        id: pet.id,
        nome: pet.nome,
        especie: pet.especie,
        raca: pet.raca,
        cor: pet.cor,
        data_nascimento: pet.data_nascimento ? new Date(pet.data_nascimento) : undefined
      })) : []
    }));

    this.tutores.set(tutoresFormatados); 
    return this.tutores();
  }
}