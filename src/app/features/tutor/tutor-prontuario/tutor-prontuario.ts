import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import {
  ProntuarioDetalheTutorView,
  ProntuarioService,
} from '../../../core/services/prontuario.service';

@Component({
  selector: 'app-tutor-prontuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-prontuario.html',
})
export class TutorProntuarioComponent implements OnInit {
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService).client;
  private prontuarioService = inject(ProntuarioService);

  public prontuario = signal<ProntuarioDetalheTutorView | null>(null);
  public isLoading = signal(true);
  public erro = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const prontuarioId = this.route.snapshot.paramMap.get('id');
    this.isLoading.set(true);
    this.erro.set(null);

    if (!prontuarioId) {
      this.erro.set('Prontuário não encontrado.');
      this.isLoading.set(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const tutorId = session?.user?.id;

      if (!tutorId) {
        this.erro.set('Sessão expirada. Faça login novamente.');
        return;
      }

      const detalhe = await this.prontuarioService.buscarProntuarioPorId(prontuarioId, tutorId);

      if (!detalhe) {
        this.erro.set('Prontuário não encontrado ou você não tem permissão para visualizá-lo.');
        return;
      }

      this.prontuario.set(detalhe);
    } catch (error) {
      console.error('Erro ao carregar prontuário:', error);
      this.erro.set('Não foi possível carregar o prontuário.');
    } finally {
      this.isLoading.set(false);
    }
  }

  public voltar(): void {
    this.location.back();
  }

  public imprimirProntuario(): void {
    window.print();
  }
}
