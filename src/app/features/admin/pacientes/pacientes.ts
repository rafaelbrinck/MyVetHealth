import { Component, signal, computed } from '@angular/core'; // Adicionamos o 'computed'
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css'
})
export class PacientesComponent {
  
  // 1. Nossa lista original (adicionei CPFs fictícios para testarmos a busca)
  public listaPacientes = signal([
    { id: 1, nome: 'Max', especie: 'Cachorro', raca: 'Golden Retriever', tutor: 'João da Silva', cpf: '111.111.111-11', ultimaConsulta: 'Hoje' },
    { id: 2, nome: 'Mia', especie: 'Gato', raca: 'Siamês', tutor: 'Ana Clara', cpf: '222.222.222-22', ultimaConsulta: '12/03/2026' },
    { id: 3, nome: 'Bolinha', especie: 'Cachorro', raca: 'Beagle', tutor: 'Carlos Eduardo', cpf: '333.333.333-33', ultimaConsulta: '05/01/2026' },
    { id: 4, nome: 'Luna', especie: 'Gato', raca: 'Persa', tutor: 'Mariana', cpf: '444.444.444-44', ultimaConsulta: '28/02/2026' },
    { id: 5, nome: 'Thor', especie: 'Cachorro', raca: 'Bulldog Francês', tutor: 'Pedro Brum', cpf: '555.555.555-55', ultimaConsulta: '15/03/2026' },
    { id: 6, nome: 'Fred', especie: 'Outro', raca: 'Papagaio', tutor: 'Roberto Alves', cpf: '666.666.666-66', ultimaConsulta: 'Nunca' }
  ]);

  // 2. Signal que vai guardar o texto que a recepcionista digitar
  public termoBusca = signal('');

  // 3. O Signal Computado que filtra a lista automaticamente
  public pacientesFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();

    // Se o input estiver vazio, retorna todos os pacientes
    if (!termo) {
      return this.listaPacientes();
    }

    // Filtra procurando o termo no Nome do Pet, Nome do Tutor, Raça ou CPF
    return this.listaPacientes().filter(pet => 
      pet.nome.toLowerCase().includes(termo) ||
      pet.tutor.toLowerCase().includes(termo) ||
      pet.raca.toLowerCase().includes(termo) ||
      (pet.cpf && pet.cpf.includes(termo))
    );
  });

  // 4. Função chamada sempre que o usuário digitar no input
  public aoDigitar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }

}