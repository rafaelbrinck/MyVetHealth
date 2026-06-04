import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConsultaService, StatusConsulta } from '../../../core/services/consulta.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  public consultaService = inject(ConsultaService);

  public metricas = computed(() => {
    const totalConsultasHoje = this.consultaService.filaHoje().length;

    return {
      consultasHoje: totalConsultasHoje,
      faturamentoDia: 'R$ 0,00',
      alertasEstoque: 0,
    };
  });

  async ngOnInit() {
    try {
      await this.consultaService.carregarConsultasDaClinica();
    } catch (error) {
      console.error('Falha ao carregar dashboard', error);
    }
  }

  // 🔄 Atualizado: Processa o início do atendimento médico em tempo real
  public async abrirFicha(consultaId: string, status: string): Promise<void> {
    try {
      console.log(`Iniciando atendimento clínico para a consulta ID: ${consultaId}`);

      if (status != 'em_andamento') {
        // 1. Altera o status para 'em_andamento' no Supabase. O canal websocket vai refletir isso na UI.
        await this.consultaService.atualizarStatus(consultaId, 'em_andamento');
      }

      // 2. Transiciona o veterinário para o prontuário injetando o id na URL
      this.router.navigate(['/clinica/prontuario', consultaId]);
    } catch (error) {
      console.error('Falha ao transicionar status da consulta:', error);
      alert('Não foi possível iniciar o atendimento médico. Verifique sua conexão.');
    }
  }

  public verAgendaCompleta(): void {
    this.router.navigate(['/clinica/calendario']);
  }

  badgeClasses(status: StatusConsulta): string {
    switch (status) {
      case 'em_andamento':
        return 'bg-teal-100 text-[#0b8a7a] dark:bg-teal-950/70 dark:text-emerald-300 border border-teal-200/80 dark:border-teal-800/60';
      case 'aguardando':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/55 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/50';
      case 'agendada':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200 border border-orange-200/80 dark:border-orange-800/50';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-neutral-200 border border-neutral-200 dark:border-slate-600';
    }
  }

  labelStatus(status: StatusConsulta): string {
    switch (status) {
      case 'em_andamento':
        return 'Em Sala';
      case 'aguardando':
        return 'Aguardando';
      case 'agendada':
        return 'Agendada';
      default:
        return status;
    }
  }
}
