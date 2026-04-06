import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css'
})
export class PacientesComponent {
  
  // O Angular "injeta" o roteador para podermos trocar de tela via código
  private router = inject(Router);

  public listaPacientes = signal([
    { id: 1, nome: 'Max', especie: 'Cachorro', raca: 'Golden Retriever', tutor: 'João da Silva', cpf: '111.111.111-11', ultimaConsulta: 'Hoje' },
    { id: 2, nome: 'Mia', especie: 'Gato', raca: 'Siamês', tutor: 'Ana Clara', cpf: '222.222.222-22', ultimaConsulta: '12/03/2026' },
    { id: 3, nome: 'Bolinha', especie: 'Cachorro', raca: 'Beagle', tutor: 'Carlos Eduardo', cpf: '333.333.333-33', ultimaConsulta: '05/01/2026' },
    { id: 4, nome: 'Luna', especie: 'Gato', raca: 'Persa', tutor: 'Mariana', cpf: '444.444.444-44', ultimaConsulta: '28/02/2026' },
    { id: 5, nome: 'Thor', especie: 'Cachorro', raca: 'Bulldog Francês', tutor: 'Pedro Brum', cpf: '555.555.555-55', ultimaConsulta: '15/03/2026' },
    { id: 6, nome: 'Fred', especie: 'Outro', raca: 'Papagaio', tutor: 'Roberto Alves', cpf: '666.666.666-66', ultimaConsulta: 'Nunca' }
  ]);

  public termoBusca = signal('');

  public pacientesFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    if (!termo) return this.listaPacientes();

    return this.listaPacientes().filter(pet => 
      pet.nome.toLowerCase().includes(termo) ||
      pet.tutor.toLowerCase().includes(termo) ||
      pet.raca.toLowerCase().includes(termo) ||
      (pet.cpf && pet.cpf.includes(termo))
    );
  });

  public aoDigitar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }

  // ==========================================
  // FUNÇÕES DE AÇÃO DOS BOTÕES
  // ==========================================

  public iniciarAtendimento(nomePet: string): void {
    console.log('Navegando para prontuários... Paciente:', nomePet);
    // Redireciona o usuário para a rota de prontuários
    this.router.navigate(['/clinica/prontuarios']);
  }

  public verHistorico(nomePet: string): void {
    // Exibe um alerta na tela do navegador
    alert(`Preparando o histórico médico do paciente: ${nomePet} 🐾`);
  }

}