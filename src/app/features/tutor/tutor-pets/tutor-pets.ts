import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CriarPetDTO } from '../../../core/models/pet.model';
import { PetService } from '../../../core/services/pet.service';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-tutor-pets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-pets.html',
})
export class TutorPetsComponent implements OnInit {
  // petService deve ser PUBLIC para o HTML conseguir enxergar o Signal lá dentro
  public petService = inject(PetService);
  private supabaseService = inject(SupabaseService);

  public isModalOpen = signal(false);
  public isLoading = signal(true);

  private authTutorId: string | null = null;

  async ngOnInit() {
    this.isLoading.set(true);
    try {
      const { data: sessionData } = await this.supabaseService.client.auth.getSession();
      this.authTutorId = sessionData.session?.user?.id || null;

      if (this.authTutorId) {
        // Carrega os dados via Service (ele decide se bate no banco ou usa cache)
        await this.petService.carregarPetsDoTutor(this.authTutorId);
      }
    } catch (error) {
      console.error('Erro ao inicializar pets na tela:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public abrirModal(): void {
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }

  public async salvarPet(
    nome: string,
    especie: string,
    raca: string,
    dataNascimentoString: string,
    pesoAtual: number,
  ): Promise<void> {
    if (!nome.trim()) {
      alert('Por favor, preencha o nome do pet!');
      return;
    }

    if (!this.authTutorId) {
      alert('Sessão inválida. Por favor, faça login novamente.');
      return;
    }

    const dataNascimento = dataNascimentoString ? new Date(dataNascimentoString) : undefined;

    const novoPetData: CriarPetDTO = {
      nome: nome,
      especie: especie || 'Não informada',
      raca: raca || 'Sem raça definida',
      tutor_id: this.authTutorId,
      data_nascimento: dataNascimento,
      peso_atual: pesoAtual,
    };

    try {
      // O service salva no banco e já atualiza o Signal reativo da tela
      await this.petService.addPet(novoPetData);
      this.fecharModal();
    } catch (error) {
      console.error('Erro no componente ao salvar pet:', error);
      alert('Ocorreu um erro ao salvar seu companheiro. Tente novamente.');
    }
  }
}
