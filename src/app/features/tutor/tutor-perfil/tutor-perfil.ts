import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme.service';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-tutor-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-perfil.html',
})
export class TutorPerfilComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);
  private supabaseService = inject(SupabaseService);
  readonly themeService = inject(ThemeService);

  // Signals gerenciando os dados reais e estados visuais
  public usuario = signal<any>(null);
  public isLoading = signal(true);
  public notificacoesAtivas = signal(true);
  public isEditModalOpen = signal(false);

  // Armazena o ID da sessão atual
  private userId: string | null = null;

  async ngOnInit() {
    await this.carregarPerfil();
  }

  private async carregarPerfil() {
    this.isLoading.set(true);
    try {
      // 1. Identifica quem está logado
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      this.userId = sessionData.session?.user?.id || null;

      if (this.userId) {
        // 2. Busca os dados complementares na tabela de perfis
        const { data: perfil, error } = await this.supabaseService.client
          .from('perfis')
          .select('nome_completo, email, telefone, criado_em')
          .eq('id', this.userId)
          .single();

        if (perfil && !error) {
          // 3. Alimenta o Signal mapeando para o layout esperado
          this.usuario.set({
            nome: perfil.nome_completo || 'Novo Usuario',
            email: perfil.email || sessionData.session?.user?.email,
            telefone: perfil.telefone || 'Não informado',
            membroDesde: this.formatarDataMembro(perfil.criado_em),
            foto: perfil.nome_completo ? perfil.nome_completo.charAt(0).toUpperCase() : 'N',
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar o perfil do tutor:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Função utilitária para formatar a data
  private formatarDataMembro(dataString: string): string {
    if (!dataString) return 'Data desconhecida';
    const data = new Date(dataString);
    const meses = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return `${meses[data.getMonth()]} de ${data.getFullYear()}`;
  }

  public toggleNotificacoes(): void {
    this.notificacoesAtivas.update((v) => !v);
  }

  public abrirEdicao(): void {
    this.isEditModalOpen.set(true);
  }

  public fecharEdicao(): void {
    this.isEditModalOpen.set(false);
  }

  public aoEscolherFoto(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Espaço reservado para implementação do Supabase Storage
      this.usuario.update((u: any) => ({ ...u, foto: '📸' }));
    }
  }

  // ATUALIZAÇÃO: Adicionado o parâmetro 'nome' para salvar no banco
  public async salvarEdicao(nome: string, email: string, telefone: string): Promise<void> {
    if (!nome.trim() || !email.trim() || !telefone.trim() || !this.userId) return;

    try {
      // Faz o Update direto na tabela de perfis incluindo o nome_completo
      const { error } = await this.supabaseService.client
        .from('perfis')
        .update({ nome_completo: nome, email: email, telefone: telefone })
        .eq('id', this.userId);

      if (error) throw error;

      // Atualização Otimista: Modifica a tela sem precisar buscar de novo no banco
      // A foto já recalcula a primeira letra baseada no novo nome!
      this.usuario.update((u: any) => ({
        ...u,
        nome,
        email,
        telefone,
        foto: nome.charAt(0).toUpperCase(),
      }));

      this.fecharEdicao();
    } catch (error) {
      console.error('Erro ao atualizar os dados do perfil:', error);
      alert('Não foi possível salvar as alterações. Tente novamente.');
    }
  }

  public async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
