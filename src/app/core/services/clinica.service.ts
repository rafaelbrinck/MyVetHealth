import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase'; // Ajuste o caminho conforme seu projeto
@Injectable({
  providedIn: 'root',
})
export class ClinicaService {
  private supabase = inject(SupabaseService).client;

  // Busca as clínicas que o usuário logado tem acesso
  async getClinicasDoUsuario(userId: string) {
    const { data, error } = await this.supabase
      .from('equipe_clinica')
      .select(
        `
        papel,
        clinicas ( id, nome_fantasia, razao_social )
      `,
      )
      .eq('perfil_id', userId)
      .eq('ativo', true);

    if (error) throw error;

    // Mapeia o retorno para um formato mais limpo para o front-end
    return data.map((item: any) => ({
      id: item.clinicas.id,
      nome: item.clinicas.nome_fantasia,
      razao_social: item.clinicas.razao_social,
      papel: item.papel,
    }));
  }

  async criarClinicaEVincular(userId: string, valoresFormulario: any) {
    // 1. Cria a Clínica na tabela 'clinicas'
    const { data: clinica, error: clinicaError } = await this.supabase
      .from('clinicas')
      .insert({
        razao_social: valoresFormulario.razaoSocial,
        nome_fantasia: valoresFormulario.nomeFantasia,
        cnpj: valoresFormulario.cnpj,
        telefone_contato: valoresFormulario.telefone,
        cep: valoresFormulario.cep,
        cidade: valoresFormulario.cidade,
        uf: valoresFormulario.uf?.toUpperCase(),
      })
      .select('id')
      .single();

    if (clinicaError) throw clinicaError;

    // 2. Tenta vincular o usuário atual como dono ('admin_clinica')
    const { error: equipeError } = await this.supabase.from('equipe_clinica').insert({
      clinica_id: clinica.id,
      perfil_id: userId,
      papel: 'admin_clinica',
    });

    // 3. O Tratamento Sênior (Rollback Manual)
    if (equipeError) {
      console.warn('Erro ao vincular dono. Iniciando rollback da clínica...', equipeError);

      // Deleta a clínica que acabou de ser criada para não deixar lixo no banco
      const { error: rollbackError } = await this.supabase
        .from('clinicas')
        .delete()
        .eq('id', clinica.id);

      if (rollbackError) {
        // Se até o rollback falhar (ex: internet caiu de vez), logamos isso criticamente.
        console.error('Falha CRÍTICA no rollback. Clínica fantasma gerada:', clinica.id);
      }

      // Agora sim, jogamos o erro para a tela avisando o usuário
      throw new Error(
        'Ocorreu um problema ao criar seu acesso. O processo foi cancelado por segurança. Tente novamente.',
      );
    }

    return clinica.id; // Retorna o ID recém-criado
  }

  // Valida o token e vincula o usuário à clínica convidada
  async aceitarConvite(userId: string, tokenFormatado: string) {
    // 1. Busca o convite pendente
    const { data: convite, error: buscaError } = await this.supabase
      .from('convites_clinica')
      .select('*')
      .eq('token', tokenFormatado)
      .eq('status', 'pendente')
      .single();

    if (buscaError || !convite) {
      throw new Error('Convite inválido, expirado ou já utilizado.');
    }

    // Opcional: Verificar se o token expirou por data
    const dataExpiracao = new Date(convite.expira_em);
    if (new Date() > dataExpiracao) {
      // Atualiza para expirado no banco para limpar a sujeira
      await this.supabase
        .from('convites_clinica')
        .update({ status: 'expirado' })
        .eq('id', convite.id);
      throw new Error('Este convite já expirou.');
    }

    // 2. Cria o vínculo do usuário com a clínica usando o papel definido no convite
    const { error: vinculoError } = await this.supabase.from('equipe_clinica').insert({
      clinica_id: convite.clinica_id,
      perfil_id: userId,
      papel: convite.papel,
    });

    if (vinculoError) {
      // Código 23505 no Postgres é violação de Unique Constraint (usuário já está na clínica)
      if (vinculoError.code === '23505') {
        throw new Error('Você já faz parte desta clínica.');
      }
      throw vinculoError;
    }

    // 3. Atualiza o status do convite para 'aceito' para que não possa ser usado de novo
    const { error: updateError } = await this.supabase
      .from('convites_clinica')
      .update({ status: 'aceito' })
      .eq('id', convite.id);

    if (updateError) throw updateError;

    // Retorna o ID da clínica para o componente saber para onde redirecionar
    return convite.clinica_id;
  }
}
