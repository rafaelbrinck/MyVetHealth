import { Component, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-pet-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pet-perfil.html'
})
export class PetPerfilComponent {
  
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

  // Array de receitas garantido
  public receitasAtivas = signal([
    { 
      medicamento: 'Bravecto 10-20kg', 
      dosagem: '1 Comprimido', 
      posologia: 'Fornecer via oral a cada 12 semanas junto com alimento.', 
      data: 'Hoje',
      veterinario: 'Dra. Eduarda Toppor'
    }
  ]);

  public vacinas = signal([
    { nome: 'V10', dataAplicacao: '10/04/2025', proximaDose: '10/04/2026', status: 'Em dia' },
    { nome: 'Raiva', dataAplicacao: '15/05/2025', proximaDose: '15/05/2026', status: 'Em dia' }
  ]);

  // Controles do Modal de Medicamento
  public isMedicineModalOpen = signal(false);
  public selectedMedicine = signal<any>(null);

  public voltar(): void {
    this.location.back();
  }

  // --- Funções da Receita ---
  public abrirDetalhesMedicamento(receita: any): void {
    this.selectedMedicine.set(receita);
    this.isMedicineModalOpen.set(true);
  }

  public fecharModalMedicamento(): void {
    this.isMedicineModalOpen.set(false);
  }

  // --- Função de Trocar Foto ---
  public aoEscolherFoto(event: any): void {
    const file = event.target.files[0];
    if (file) {
      alert(`Você selecionou o arquivo: ${file.name}.\n\nO Rafael vai usar essa função para enviar a foto para o Supabase Storage!`);
      this.pet.update(p => ({ ...p, foto: '🖼️' }));
    }
  }
}