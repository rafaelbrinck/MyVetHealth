import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import {
  ConsultaService,
  ConsultaTutorView,
} from '../../../core/services/consulta.service';

@Component({
  selector: 'app-tutor-consultas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-consultas.html',
})
export class TutorConsultasComponent implements OnInit {
  private location = inject(Location);
  private supabase = inject(SupabaseService).client;
  private consultaService = inject(ConsultaService);

  public isLoading = signal(true);
  public erro = signal<string | null>(null);
  public consultas = signal<ConsultaTutorView[]>([]);
  public consultaSelecionada = signal<ConsultaTutorView | null>(null);
  public isModalOpen = signal(false);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    this.erro.set(null);

    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session?.user) {
        this.erro.set('Sessão expirada. Faça login novamente.');
        return;
      }

      await this.consultaService.carregarConsultasTutor();
      this.consultas.set(this.consultaService.consultasTutor());
    } catch (error) {
      console.error('Erro ao carregar consultas do tutor:', error);
      this.erro.set('Não foi possível carregar suas consultas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  public voltar(): void {
    this.location.back();
  }

  public abrirDetalhes(consulta: ConsultaTutorView): void {
    this.consultaSelecionada.set(consulta);
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }
}
