// ==========================================
// 1. TIPOS E ENUMS
// ==========================================
export type StatusConsulta =
  | 'Agendado'
  | 'Aguardando'
  | 'Em Atendimento'
  | 'Finalizado'
  | 'Cancelado';

// ==========================================
// 2. DOMAIN MODELS (Tabela do Banco)
// ==========================================
export interface Consulta {
  id: string;
  clinica_id: string;
  veterinario_id: string;
  pet_id: string;
  status: StatusConsulta;
  peso_momento?: number;
  sintomas?: string;
  diagnostico?: string;
  notas_privadas?: string;
  historico_compartilhado?: string;
  data_consulta: string; // ISO String (Timestamptz)
  atualizado_em?: string;
}

// ==========================================
// 3. VIEW MODELS (Formatado para a Tela)
// ==========================================
export interface ConsultaView {
  id: string;
  pet: string;
  especie: string;
  raca: string | null;
  tutor: string;
  data_completa: Date; // Usado para filtros internos
  horario: string; // Ex: '09:00'
  status: StatusConsulta;
}

// ==========================================
// 4. DTOs
// ==========================================
export interface CriarConsultaDTO {
  pet_id: string;
  veterinario_id: string;
  data_consulta: string;
}
