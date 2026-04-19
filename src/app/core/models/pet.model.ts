export interface Pet {
  id: string;
  tutor_id: number;
  nome: string;
  especie: string;
  raca: string;
  data_nascimento: Date;
  peso_atual: string;
  foto_url?: string;
  criado_em: Date;
  atualizado_em?: Date;
  clinica_id: string;
  cor?: string;
}

export type CriarPetDTO = Omit<Pet, 'id' | 'criado_em' | 'atualizado_em'>;

export type AtualizarPetDTO = Partial<CriarPetDTO>;
