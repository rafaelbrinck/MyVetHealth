import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  
  // Sinais com dados fictícios para montarmos o visual
  public metricas = signal({
    consultasHoje: 12,
    faturamentoDia: 'R$ 1.450,00',
    alertasEstoque: 3
  });

  public filaHoje = signal([
    { id: 1, pet: 'Thor', especie: 'Cachorro', tutor: 'João da Silva', horario: '09:00', status: 'Em Atendimento' },
    { id: 2, pet: 'Mia', especie: 'Gato', tutor: 'Ana Clara', horario: '10:30', status: 'Aguardando' },
    { id: 3, pet: 'Bolinha', especie: 'Cachorro', tutor: 'Carlos Eduardo', horario: '14:00', status: 'Agendado' },
    { id: 4, pet: 'Luna', especie: 'Gato', tutor: 'Mariana', horario: '16:00', status: 'Agendado' }
  ]);

}