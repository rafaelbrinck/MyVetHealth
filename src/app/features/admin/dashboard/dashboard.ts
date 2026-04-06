import { Component, signal, inject } from '@angular/core'; // Adicionamos inject
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // Importamos o motorista das rotas

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  
  // Injetamos o Router para permitir a navegação via código
  private router = inject(Router);

  public metricas = signal({
    consultasHoje: 12,
    faturamentoDia: 'R$ 1.450,00',
    alertasEstoque: 3
  });

  public filaHoje = signal([
    { id: 1, pet: 'Thor', especie: 'Cachorro', tutor: 'João da Silva', horario: '09:00', status: 'Em Atendimento' },
    { id: 2, pet: 'Mia', especie: 'Gato', tutor: 'Ana Clara', horario: '10:30', status: 'Aguardando' },
    { id: 3, pet: 'Bolinha', especie: 'Cachorro', raca: 'Beagle', tutor: 'Carlos Eduardo', horario: '14:00', status: 'Agendado' },
    { id: 4, pet: 'Luna', especie: 'Gato', tutor: 'Mariana', horario: '16:00', status: 'Agendado' }
  ]);

  // ==========================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ==========================================

  /**
   * Leva o veterinário diretamente para o prontuário do pet selecionado
   */
  public abrirFicha(nomePet: string): void {
    console.log(`Iniciando atendimento para: ${nomePet}`);
    this.router.navigate(['/clinica/prontuarios']);
  }

  /**
   * Leva a recepção para a lista completa de pacientes/agenda
   */
  public verAgendaCompleta(): void {
    this.router.navigate(['/clinica/pacientes']);
  }
}