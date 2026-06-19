import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import {
  ProntuarioService,
  ReceitaTutorView,
} from '../../../core/services/prontuario.service';

@Component({
  selector: 'app-tutor-receitas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-receitas.html',
})
export class TutorReceitasComponent implements OnInit {
  private location = inject(Location);
  private supabase = inject(SupabaseService).client;
  private prontuarioService = inject(ProntuarioService);

  public isLoading = signal(true);
  public erro = signal<string | null>(null);
  public receitas = signal<ReceitaTutorView[]>([]);
  public isModalOpen = signal(false);
  public receitaSelecionada = signal<ReceitaTutorView | null>(null);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    this.erro.set(null);

    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const tutorId = session?.user?.id;

      if (!tutorId) {
        this.erro.set('Sessão expirada. Faça login novamente.');
        return;
      }

      await this.prontuarioService.carregarReceitasTutor(tutorId);
      this.receitas.set(this.prontuarioService.receitas());
    } catch (error) {
      console.error('Erro ao carregar receituário digital:', error);
      this.erro.set('Não foi possível carregar suas receitas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  public voltar(): void {
    this.location.back();
  }

  public abrirDetalhes(receita: ReceitaTutorView): void {
    this.receitaSelecionada.set(receita);
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }
}
