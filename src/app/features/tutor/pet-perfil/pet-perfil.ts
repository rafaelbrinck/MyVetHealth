import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PetService } from '../../../core/services/pet.service'; // Ajuste o caminho
import { SupabaseService } from '../../../core/services/supabase'; // Ajuste o caminho

@Component({
  selector: 'app-pet-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pet-perfil.html',
})
export class PetPerfilComponent implements OnInit {
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private petService = inject(PetService);
  private supabaseService = inject(SupabaseService);

  // O pet será carregado dinamicamente
  public pet = signal<any | null>(null);
  public isLoading = signal(true);

  // Dados mocados mantidos para histórico e receitas (Até implementarmos o BD deles)
  public historicoPeso = signal([
    { data: 'Hoje', peso: 25.5, variacao: '+0.5', status: 'aumento' },
    { data: 'Mar/26', peso: 25.0, variacao: '-1.2', status: 'reducao' },
    { data: 'Fev/26', peso: 26.2, variacao: '0', status: 'inicial' },
  ]);

  public receitasAtivas = signal([
    {
      medicamento: 'Bravecto 10-20kg',
      dosagem: '1 Comprimido',
      posologia: 'A cada 3 meses',
      dr: 'Dra. Ana',
    },
    {
      medicamento: 'Apoquel 16mg',
      dosagem: '1/2 Comprimido',
      posologia: '1x ao dia (Uso contínuo)',
      dr: 'Dra. Ana',
    },
  ]);

  // Controles de Modais
  public isMedicineModalOpen = signal(false);
  public selectedMedicine = signal<any>(null);
  public isCarteirinhaOpen = signal(false);
  public isShareModalOpen = signal(false);
  public codigoGerado = signal<string | null>(null);

  async ngOnInit() {
    this.isLoading.set(true);
    // Pega o ID do Pet que veio na URL
    const petId = this.route.snapshot.paramMap.get('id');

    if (petId) {
      // Tenta buscar do cache do nosso Service (caso venha da Home/Lista)
      let petEncontrado = this.petService.meusPets().find((p) => p.id === petId);

      // Se não achou (ex: usuário deu F5 na página), recarrega do banco
      if (!petEncontrado) {
        const { data: session } = await this.supabaseService.client.auth.getSession();
        const tutorId = session.session?.user?.id;

        if (tutorId) {
          await this.petService.carregarPetsDoTutor(tutorId, true);
          petEncontrado = this.petService.meusPets().find((p) => p.id === petId);
        }
      }

      // Se achou o pet com sucesso, injeta no Signal para desenhar a tela
      if (petEncontrado) {
        this.pet.set({
          ...petEncontrado,
          // Garante fallback de imagem e calcula idade
          foto:
            petEncontrado.foto || (petEncontrado.especie?.toLowerCase() === 'gato' ? '🐈' : '🐕'),
          idade: this.calcularIdade(petEncontrado.data_nascimento),
          pesoAtual: petEncontrado.peso_atual ? `${petEncontrado.peso_atual} kg` : 'Não registrado',
          nascimento: this.formatarDataBr(petEncontrado.data_nascimento),
        });
      }
    }

    this.isLoading.set(false);
  }

  // Cálculos utilitários
  private calcularIdade(dataNascimento: string): string {
    if (!dataNascimento) return 'Idade não informada';
    const nasc = new Date(dataNascimento);
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;

    if (anos < 1) return 'Menos de 1 ano';
    return anos === 1 ? '1 ano' : `${anos} anos`;
  }

  private formatarDataBr(data: string): string {
    if (!data) return 'Não informada';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Navegação e Modais
  public voltar(): void {
    this.location.back();
  }

  public abrirDetalhesMedicamento(receita: any): void {
    this.selectedMedicine.set(receita);
    this.isMedicineModalOpen.set(true);
  }
  public fecharModalMedicamento(): void {
    this.isMedicineModalOpen.set(false);
  }

  public abrirCarteirinha(): void {
    this.isCarteirinhaOpen.set(true);
  }
  public fecharCarteirinha(): void {
    this.isCarteirinhaOpen.set(false);
  }

  public abrirCompartilhamento(): void {
    this.isShareModalOpen.set(true);
  }
  public fecharCompartilhamento(): void {
    this.isShareModalOpen.set(false);
    this.codigoGerado.set(null);
  }

  public gerarCodigoAuth(): void {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    this.codigoGerado.set(codigo);
  }
}
