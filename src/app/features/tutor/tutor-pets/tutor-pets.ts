import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tutor-pets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-pets.html',
  styleUrl: './tutor-pets.css'
})
export class TutorPetsComponent {
  
  // Lista completa de pets do tutor
  public meusPets = signal([
    { 
      id: 1, 
      nome: 'Max', 
      especie: 'Cachorro', 
      raca: 'Golden Retriever', 
      foto: '🐕',
      proximaVacina: 'V10 em 10/04/2026',
      status: 'Saudável'
    },
    { 
      id: 2, 
      nome: 'Mia', 
      especie: 'Gato', 
      raca: 'Siamês', 
      foto: '🐈',
      proximaVacina: 'V4 em 12/03/2027',
      status: 'Tratamento ativo'
    },
    { 
      id: 3, 
      nome: 'Thor', 
      especie: 'Cachorro', 
      raca: 'Bulldog Francês', 
      foto: '🐶',
      proximaVacina: 'Raiva em 15/10/2026',
      status: 'Saudável'
    }
  ]);

  public adicionarPet(): void {
    alert('Aqui abriremos o fluxo para o tutor cadastrar um novo animal no sistema! 🐾');
  }
}