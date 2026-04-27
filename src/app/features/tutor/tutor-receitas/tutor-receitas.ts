import { Component, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-tutor-receitas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-receitas.html'
})
export class TutorReceitasComponent {
  
  private location = inject(Location);
  
  // Controles do Modal Glassmorphism
  public isModalOpen = signal(false);
  public receitaSelecionada = signal<any>(null);

  public receitas = signal([
    { pet: 'Max', medicamento: 'Bravecto 10-20kg', data: 'Hoje', uso: '1 comprimido a cada 12 semanas', vet: 'Dra. Eduarda' },
    { pet: 'Mia', medicamento: 'Feliway Classic', data: '05/02/2026', uso: 'Borrifar no ambiente 1x ao dia', vet: 'Dr. Gustavo' }
  ]);

  public voltar(): void { this.location.back(); }
  
  public abrirDetalhes(receita: any): void {
    this.receitaSelecionada.set(receita);
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }
}