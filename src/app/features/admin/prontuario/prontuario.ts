import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// Tipagem simples para o nosso medicamento
interface Medicamento {
  nome: string;
  dosagem: string;
  posologia: string;
}

@Component({
  selector: 'app-prontuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prontuario.html',
  styleUrl: './prontuario.css'
})
export class ProntuarioComponent {
  
  // Informações estáticas do paciente
  public paciente = signal({
    nome: 'Max',
    especie: 'Cachorro',
    raca: 'Golden Retriever',
    tutor: 'João da Silva',
    idade: '3 anos'
  });

  // Signal que guarda a lista de remédios que vão para a receita digital
  public medicamentosReceita = signal<Medicamento[]>([]);

  /**
   * Função para simular a adição de um medicamento na lista
   */
  public adicionarMedicamentoSimulado(): void {
    const novoMed: Medicamento = {
      nome: 'Bravecto 10-20kg',
      dosagem: '1 Comprimido',
      posologia: 'Fornecer via oral a cada 12 semanas'
    };
    
    // Atualiza o signal adicionando o novo item na lista
    this.medicamentosReceita.update(lista => [...lista, novoMed]);
  }

  /**
   * Remove um medicamento da lista pelo índice
   */
  public removerMedicamento(index: number): void {
    this.medicamentosReceita.update(lista => lista.filter((_, i) => i !== index));
  }
}