import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConsultaService } from '../../../core/services/consulta.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  public consultaService = inject(ConsultaService);

  // ==========================================
  // A MÁGICA ACONTECE AQUI:
  // Trocamos 'signal' por 'computed'.
  // Agora, toda vez que o WebSocket alterar a fila no Service,
  // essa variável é recalculada instantaneamente!
  // ==========================================
  public metricas = computed(() => {
    // Lemos a fila de hoje do service em tempo real
    const totalConsultasHoje = this.consultaService.filaHoje().length;

    return {
      consultasHoje: totalConsultasHoje,
      faturamentoDia: 'R$ 0,00', // Futuramente você vai plugar seu FinanceiroService aqui
      alertasEstoque: 0, // Futuramente plugar seu EstoqueService aqui
    };
  });

  async ngOnInit() {
    try {
      // Apenas mandamos carregar. Não precisamos mais calcular as métricas manualmente aqui!
      await this.consultaService.carregarConsultasDaClinica();
    } catch (error) {
      console.error('Falha ao carregar dashboard', error);
    }
  }

  public abrirFicha(nomePet: string): void {
    console.log(`Iniciando atendimento para: ${nomePet}`);
    this.router.navigate(['/clinica/prontuarios']);
  }

  public verAgendaCompleta(): void {
    this.router.navigate(['/clinica/calendario']);
  }
}
