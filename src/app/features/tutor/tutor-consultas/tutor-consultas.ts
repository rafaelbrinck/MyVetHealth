import { Component, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tutor-consultas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-consultas.html'
})
export class TutorConsultasComponent {
  
  private location = inject(Location);

  // Simulando JOIN entre 'consultas' e 'resumo_consultas' do Supabase
  public consultas = signal([
    { 
      id: 1, 
      pet: 'Max', 
      data: '12/05/2026', 
      hora: '14:30', 
      vet: 'Dra. Eduarda Toppor', 
      status: 'Agendada',
      sintomas: 'Coceira intensa na orelha direita.',
      resumo_publico: null // Ainda não aconteceu
    },
    { 
      id: 2, 
      pet: 'Mia', 
      data: '10/03/2026', 
      hora: '10:00', 
      vet: 'Dr. Gustavo Leite', 
      status: 'Concluída',
      sintomas: 'Vômito e falta de apetite há 2 dias.',
      resumo_publico: 'Paciente apresentou quadro de gastrite leve. Foi medicada no consultório. Receitada dieta leve e Feliway para redução de estresse. Retorno se não melhorar em 48h.'
    },
    { 
      id: 3, 
      pet: 'Max', 
      data: '15/01/2026', 
      hora: '09:15', 
      vet: 'Dr. Danton Rodrigues', 
      status: 'Concluída',
      sintomas: 'Rotina e vacinação anual.',
      resumo_publico: 'Exame clínico geral sem alterações. Peso ideal mantido. Realizada aplicação de V10 e reforço anual. Tudo excelente com o Max.'
    }
  ]);

  public consultaSelecionada = signal<any>(null);
  public isModalOpen = signal(false);

  public voltar(): void {
    this.location.back();
  }

  public abrirDetalhes(consulta: any): void {
    this.consultaSelecionada.set(consulta);
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }
}