import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tutor-pets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-pets.html'
})
export class TutorPetsComponent {
  
  public meusPets = signal([
    { id: 1, nome: 'Max', especie: 'Cachorro', raca: 'Golden Retriever', foto: '🐕', proximaVacina: 'V10 em 10/04/2026', status: 'Saudável' },
    { id: 2, nome: 'Mia', especie: 'Gato', raca: 'Siamês', foto: '🐈', proximaVacina: 'V4 em 12/03/2027', status: 'Tratamento ativo' },
    { id: 3, nome: 'Thor', especie: 'Cachorro', raca: 'Bulldog Francês', foto: '🐶', proximaVacina: 'Raiva em 15/10/2026', status: 'Saudável' }
  ]);

  // Controles do Modal
  public isModalOpen = signal(false);

  public abrirModal(): void {
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }

  public salvarPet(nome: string, especie: string, raca: string): void {
    if (!nome.trim()) {
      alert('Por favor, preencha o nome do pet!');
      return;
    }

    // Define um emoji padrão dependendo da espécie
    let fotoEmoji = '🐾';
    if (especie.toLowerCase() === 'cachorro') fotoEmoji = '🐕';
    if (especie.toLowerCase() === 'gato') fotoEmoji = '🐈';

    const novoPet = {
      id: Math.random(),
      nome: nome,
      especie: especie || 'Não informada',
      raca: raca || 'Sem raça definida',
      foto: fotoEmoji,
      proximaVacina: 'A definir',
      status: 'Saudável'
    };

    // Adiciona o novo pet na lista e fecha o modal
    this.meusPets.update(lista => [...lista, novoPet]);
    this.fecharModal();
  }
}