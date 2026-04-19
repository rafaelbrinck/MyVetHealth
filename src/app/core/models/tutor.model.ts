import { Pet } from "./pet.model";

export interface Tutor {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  criado_em: Date;
  atualizado_em?: Date;
  papel: papelUsuario;
  pets: Pet[];
}

export enum papelUsuario {
  tutor = 'tutor',
  admin_plataforma = 'admin_plataforma',
}
