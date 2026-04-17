import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConsultaService } from '../../../core/services/consulta.service'; // Ajuste o caminho

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  public consultaService = inject(ConsultaService); // Injeta o Service inteiro para o HTML acessar a filaHoje

  // No HTML, ao invés de usar `filaHoje()`, você vai usar `consultaService.filaHoje()`

  public metricas = signal({
    consultasHoje: 0,
    faturamentoDia: 'R$ 0,00',
    alertasEstoque: 0,
  });

  async ngOnInit() {
    try {
      // Assim que a tela abrir, ele manda o service carregar as coisas
      await this.consultaService.carregarConsultasDaClinica();

      // Atualizamos a métrica de consultas baseado no tamanho da fila
      this.metricas.update((m) => ({
        ...m,
        consultasHoje: this.consultaService.filaHoje().length,
      }));
    } catch (error) {
      console.error('Falha ao carregar dashboard', error);
    }
  }

  public abrirFicha(nomePet: string): void {
    console.log(`Iniciando atendimento para: ${nomePet}`);
    this.router.navigate(['/clinica/prontuarios']);
  }

  public verAgendaCompleta(): void {
    this.router.navigate(['/clinica/pacientes']);
  }
}
