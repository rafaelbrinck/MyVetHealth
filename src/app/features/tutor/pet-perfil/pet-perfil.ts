import { Component, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-pet-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pet-perfil.html',
  styleUrl: './pet-perfil.css'
})
export class PetPerfilComponent {
  
  // Injetamos o Location para o botão de voltar
  private location = inject(Location);

  // Informações básicas do Pet
  public pet = signal({
    nome: 'Max',
    especie: 'Cachorro',
    raca: 'Golden Retriever',
    idade: '3 anos',
    peso: '25.5 kg',
    foto: '🐕'
  });

  // Simulando a receita que o veterinário criou no painel da clínica
  public receitasAtivas = signal([
    { 
      medicamento: 'Bravecto 10-20kg', 
      dosagem: '1 Comprimido', 
      posologia: 'Fornecer via oral a cada 12 semanas junto com alimento.', 
      data: 'Hoje',
      veterinario: 'Dra. Eduarda Toppor'
    }
  ]);

  // Simulando a carteirinha de vacinação
  public vacinas = signal([
    { nome: 'V10', dataAplicacao: '10/04/2025', proximaDose: '10/04/2026', status: 'Em dia' },
    { nome: 'Raiva', dataAplicacao: '15/05/2025', proximaDose: '15/05/2026', status: 'Em dia' }
  ]);

  public voltar(): void {
    this.location.back();
  }
}