// ==========================================
// 1. DOMAIN MODELS (Representam as tabelas do banco)
// ==========================================
export interface Clinica {
  id?: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email_contato: string;
  telefone_contato: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  logo_url?: string;
  updated_at?: string;
}

export type PapelEquipe = 'admin_clinica' | 'veterinario' | 'recepcionista';

// ==========================================
// 2. VIEW MODELS (Representam dados formatados para a tela)
// ==========================================
export interface WorkspaceClinica {
  id: string;
  nome: string;
  razao_social: string;
  papel: PapelEquipe;
}

// ==========================================
// 3. DTOs (Data Transfer Objects - Dados que trafegam entre camadas)
// ==========================================
export interface CriarClinicaDTO {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  cep?: string;
  cidade?: string;
  uf?: string;
}
