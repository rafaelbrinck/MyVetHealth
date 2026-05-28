import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PetService } from '../../../core/services/pet.service'; // Ajustado conforme seu padrão
import { SupabaseService } from '../../../core/services/supabase'; // Ajustado conforme seu padrão

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-dashboard.html',
  styleUrl: './tutor-dashboard.css',
})
export class TutorDashboardComponent implements OnInit {
  // Injeção pública para o template HTML ler o estado centralizado
  public petService = inject(PetService);
  private supabaseService = inject(SupabaseService);

  // Controle de feedback visual
  public isLoading = signal(true);

  // Dados do Tutor (Agora reativos)
  public tutor = signal({
    nome: 'Carregando...',
    saudacao: this.obterSaudacao(),
    inicial: '',
  });

  // Simulando um alerta importante
  public alertaImportante = signal({
    tipo: 'vacina',
    mensagem: 'A vacina V10 do Max vence em 5 dias!',
    acaoTexto: 'Ver Detalhes',
    ativo: true,
  });

  async ngOnInit() {
    this.isLoading.set(true);
    try {
      // Captura a sessão ativa do tutor logado no Supabase
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      const authTutorId = sessionData.session?.user?.id || null;

      if (authTutorId) {
        // 1. Dispara o carregamento global dos pets
        await this.petService.carregarPetsDoTutor(authTutorId);

        // 2. Busca apenas o nome do tutor na tabela perfis para atualizar o Header
        const { data: perfil } = await this.supabaseService.client
          .from('perfis')
          .select('nome_completo')
          .eq('id', authTutorId)
          .single();

        if (perfil) {
          const nomeReal = perfil.nome_completo || 'Tutor';
          this.tutor.set({
            nome: nomeReal,
            saudacao: this.obterSaudacao(),
            inicial: nomeReal.charAt(0).toUpperCase(),
          });
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar a Dashboard do Tutor:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Função para a saudação dinâmica conforme o horário do cliente
  private obterSaudacao(): string {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }
}
