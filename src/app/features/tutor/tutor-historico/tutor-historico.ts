import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { ProntuarioService } from '../../../core/services/prontuario.service';

@Component({
  selector: 'app-tutor-historico',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-historico.html',
})
export class TutorHistoricoComponent implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private supabase = inject(SupabaseService).client;
  public prontuarioService = inject(ProntuarioService);

  public clinicaSelecionada = signal<string | null>(null);
  public erro = signal<string | null>(null);

  public prontuariosFiltrados = computed(() => {
    const clinicaId = this.clinicaSelecionada();
    if (!clinicaId) return [];
    return this.prontuarioService.prontuarios().filter((p) => p.clinicaId === clinicaId);
  });

  async ngOnInit(): Promise<void> {
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

      await this.prontuarioService.carregarHistoricoTutor(tutorId);

      const clinicas = this.prontuarioService.clinicas();
      if (clinicas.length > 0) {
        this.clinicaSelecionada.set(clinicas[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico clínico:', error);
      this.erro.set('Não foi possível carregar seu histórico clínico.');
    }
  }

  public selecionarClinica(id: string): void {
    this.clinicaSelecionada.set(id);
  }

  public abrirProntuario(id: string): void {
    this.router.navigate(['/tutor/prontuario', id]);
  }
}
