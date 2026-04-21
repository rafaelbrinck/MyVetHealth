import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ConsultaView,
  ConsultaService,
  StatusConsulta,
} from '../../core/services/consulta.service';

@Component({
  selector: 'app-consulta-detalhe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consulta-detalhes.html',
})
export class ConsultaDetalheComponent {
  private consultaService = inject(ConsultaService);

  // Angular 17+ Signals para Inputs e Outputs
  consulta = input.required<ConsultaView>();
  fechar = output<void>();

  // Estado local para evitar cliques duplos na API
  processando = false;

  async alterarStatus(novoStatus: StatusConsulta) {
    if (this.processando) return;

    try {
      this.processando = true;
      await this.consultaService.atualizarStatus(this.consulta().id, novoStatus);

      // Opcional: fechar o painel ao finalizar ou cancelar, mas manter aberto no check-in
      if (novoStatus === 'finalizada' || novoStatus === 'cancelada') {
        this.fecharPainel();
      }
    } catch (error) {
      console.error('Erro ao atualizar status', error);
      // Aqui entraria um toast notification de erro no futuro
    } finally {
      this.processando = false;
    }
  }

  fecharPainel() {
    this.fechar.emit();
  }
}
