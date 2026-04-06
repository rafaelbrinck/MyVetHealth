import { Component, signal, inject } from '@angular/core'; // Adicionamos o inject
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // Importamos o Router

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
  
  // Injeta o roteador para a navegação final
  private router = inject(Router);

  public paciente = signal({
    nome: 'Max',
    especie: 'Cachorro',
    raca: 'Golden Retriever',
    tutor: 'João da Silva',
    idade: '3 anos'
  });

  public medicamentosReceita = signal<Medicamento[]>([]);
  public isModalOpen = signal(false);

  // ==========================================
  // CONTROLES DO MODAL DE RECEITUÁRIO
  // ==========================================

  public abrirModal(): void {
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }

  public salvarMedicamento(nome: string, dosagem: string, posologia: string): void {
    if (!nome.trim() || !dosagem.trim()) {
      alert('O Nome e a Dosagem são obrigatórios para a receita!');
      return;
    }
    const novoMed: Medicamento = { nome, dosagem, posologia };
    this.medicamentosReceita.update(lista => [...lista, novoMed]);
    this.fecharModal();
  }

  public removerMedicamento(index: number): void {
    this.medicamentosReceita.update(lista => lista.filter((_, i) => i !== index));
  }

  // ==========================================
  // FINALIZAÇÃO DO ATENDIMENTO
  // ==========================================

  /**
   * Empacota os dados da tela e simula o envio para o Supabase
   */
  public finalizarAtendimento(peso: string, temp: string, sintomas: string, diagnostico: string, notas: string): void {
    // 1. Validação básica de segurança
    if (!sintomas.trim() || !diagnostico.trim()) {
      alert('⚠️ Por favor, preencha pelo menos os Sintomas e o Diagnóstico para salvar o prontuário.');
      return;
    }

    // 2. Monta o Objeto (Payload) que o Rafael vai usar para salvar no Supabase depois
    const payloadConsulta = {
      pet: this.paciente().nome,
      sinaisVitais: { peso, temperatura: temp },
      avaliacao: { sintomas, diagnostico, notasPrivadas: notas },
      receituario: this.medicamentosReceita()
    };

    // 3. Simula a comunicação com o banco no console para vocês debugarem depois
    console.log('🚀 Enviando para o Supabase...', payloadConsulta);

    // 4. Feedback de Sucesso e Navegação
    alert(`✅ Consulta do ${this.paciente().nome} finalizada com sucesso!\n\nO receituário digital já está disponível no App do tutor.`);
    
    // 5. Limpa a mesa e volta para a recepção/dashboard
    this.router.navigate(['/clinica/dashboard']);
  }
}