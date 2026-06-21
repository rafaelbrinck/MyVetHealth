import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase';
import { ClinicaService } from '../../../core/services/clinica.service';
import { ToastService } from '../../../core/services/toast.service';

interface HistoricoRecord {
  id: string;
  data_resumo: string;
  peso: number;
  temperatura: number;
  sintomas: string;
  diagnostico: string;
  notas_privadas: string;
  receituario: any[];
  pets: {
    nome: string;
    especie: string;
    raca: string;
    perfis: {
      nome_completo: string;
    };
  };
}

@Component({
  selector: 'app-historico-prontuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historico-prontuarios.html',
  styleUrl: './historico-prontuarios.css',
})
export class HistoricoProntuariosComponent implements OnInit {
  private supabase = inject(SupabaseService).client;
  private clinicaService = inject(ClinicaService);
  private toastService = inject(ToastService);

  // Estados Centrais Reativos com Signals
  public prontuarios = signal<HistoricoRecord[]>([]);
  public filtroTexto = signal<string>('');
  public isLoading = signal<boolean>(true);
  public prontuarioSelecionado = signal<HistoricoRecord | null>(null);

  // Filtro inteligente computado em tempo real
  public prontuariosFiltrados = computed(() => {
    const busca = this.filtroTexto().toLowerCase().trim();
    const lista = this.prontuarios();

    if (!busca) return lista;

    return lista.filter(
      (item) =>
        item.pets?.nome?.toLowerCase().includes(busca) ||
        item.pets?.perfis?.nome_completo?.toLowerCase().includes(busca) ||
        item.diagnostico?.toLowerCase().includes(busca),
    );
  });

  async ngOnInit(): Promise<void> {
    await this.carregarHistorico();
  }

  /**
   * Puxa os dados com INNER JOIN relacional ordenando pela data do resumo
   */
  public async carregarHistorico(): Promise<void> {
    this.isLoading.set(true);
    try {
      const clinicaId = this.clinicaService.clinicaAtivaId;
      if (!clinicaId) throw new Error('Nenhuma clínica ativa no contexto.');

      const { data, error } = await this.supabase
        .from('resumo_consultas')
        .select(
          `
          id,
          data_resumo,
          peso,
          temperatura,
          sintomas,
          diagnostico,
          notas_privadas,
          receituario,
          pets (
            nome,
            especie,
            raca,
            perfis (
              nome_completo
            )
          )
        `,
        )
        .eq('clinica_id', clinicaId)
        .order('data_resumo', { ascending: false });

      if (error) throw error;

      this.prontuarios.set((data as unknown as HistoricoRecord[]) || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de prontuários:', error);
      this.toastService.showError('Não foi possível obter a lista de prontuários.');
    } finally {
      this.isLoading.set(false);
    }
  }

  public abrirDetalhes(registro: HistoricoRecord): void {
    this.prontuarioSelecionado.set(registro);
  }

  public fecharDetalhes(): void {
    this.prontuarioSelecionado.set(null);
  }
}
