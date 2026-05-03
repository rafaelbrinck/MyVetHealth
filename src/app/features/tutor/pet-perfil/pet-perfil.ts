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
    cor: 'Caramelo',
    idade: '3 anos',
    nascimento: '15/02/2023',
    pesoAtual: '25.5 kg',
    foto: '🐕',
    tutor: 'Pedro Brum'
  });

  // Novo Histórico de Peso (Focado em Evolução/Decadência)
  public historicoPeso = signal([
    { data: 'Hoje', peso: 25.5, variacao: '+0.5', status: 'aumento' },
    { data: 'Mar/26', peso: 25.0, variacao: '-1.2', status: 'reducao' },
    { data: 'Fev/26', peso: 26.2, variacao: '0', status: 'inicial' }
  ]);

  public receitasAtivas = signal([
    { medicamento: 'Bravecto 10-20kg', dosagem: '1 Comprimido', posologia: 'Fornecer via oral a cada 12 semanas junto com alimento.', data: 'Hoje', veterinario: 'Dra. Eduarda Toppor' }
  ]);

  public vacinas = signal([
    { nome: 'V10', dataAplicacao: '10/04/2025', proximaDose: '10/04/2026', status: 'Em dia' },
    { nome: 'Raiva', dataAplicacao: '15/05/2025', proximaDose: '15/05/2026', status: 'Em dia' }
  ]);

  public isMedicineModalOpen = signal(false);
  public isCarteirinhaOpen = signal(false);
  public selectedMedicine = signal<any>(null);

  public voltar(): void { this.location.back(); }

  public abrirDetalhesMedicamento(receita: any): void {
    this.selectedMedicine.set(receita);
    this.isMedicineModalOpen.set(true);
  }
  public fecharModalMedicamento(): void { this.isMedicineModalOpen.set(false); }

  public abrirCarteirinha(): void { this.isCarteirinhaOpen.set(true); }
  public fecharCarteirinha(): void { this.isCarteirinhaOpen.set(false); }

  public aoEscolherFoto(event: any): void {
    const file = event.target.files[0];
    if (file) this.pet.update(p => ({ ...p, foto: '🖼️' }));
  }
}