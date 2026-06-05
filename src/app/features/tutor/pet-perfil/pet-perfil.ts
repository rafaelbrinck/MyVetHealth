import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PetService } from '../../../core/services/pet.service';
import { SupabaseService } from '../../../core/services/supabase';
import { GeneroPet } from '../../../core/models/pet.model';

interface ConsultaTutor {
  id: string;
  data_resumo: string;
  peso: number;
  temperatura: number;
  sintomas: string;
  diagnostico: string;
  receituario: any[];
}

@Component({
  selector: 'app-pet-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pet-perfil.html',
})
export class PetPerfilComponent implements OnInit {
  public GeneroPet = GeneroPet;
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private petService = inject(PetService);
  private supabaseService = inject(SupabaseService);

  // Estados Centrais
  public pet = signal<any | null>(null);
  public isLoading = signal(true);

  // Histórico Clínico Blindado
  public historicoClinico = signal<ConsultaTutor[]>([]);

  // ==========================================
  // 🚀 NOVOS SINAIS COMPUTADOS PARA PESAGEM
  // ==========================================

  // 1. Filtra apenas as consultas que tiveram pesagem registrada e formata
  public historicoPesagens = computed(() => {
    return this.historicoClinico()
      .filter((consulta) => consulta.peso != null)
      .map((consulta) => ({
        id: consulta.id,
        data: this.formatarDataBr(consulta.data_resumo),
        peso: consulta.peso,
      }));
  });

  // 2. Descobre o peso mais recente para atualizar o Card Superior automaticamente
  public pesoMaisRecente = computed(() => {
    const pesagens = this.historicoPesagens();
    if (pesagens.length > 0) {
      return `${pesagens[0].peso} kg`;
    }
    // Fallback caso não tenha consulta, usa o peso inicial do cadastro do pet
    return this.pet()?.pesoAtual || 'Não registrado';
  });

  // Controles de Modais
  public isMedicineModalOpen = signal(false);
  public selectedMedicine = signal<any | null>(null);
  public isCarteirinhaOpen = signal(false);
  public isShareModalOpen = signal(false);
  public codigoGerado = signal<string | null>(null);

  async ngOnInit() {
    this.isLoading.set(true);
    const petId = this.route.snapshot.paramMap.get('id');

    if (petId) {
      // 1. Tenta buscar o Pet do cache ou do banco
      let petEncontrado = this.petService.meusPets().find((p) => p.id === petId);

      if (!petEncontrado) {
        const { data: session } = await this.supabaseService.client.auth.getSession();
        const tutorId = session.session?.user?.id;

        if (tutorId) {
          await this.petService.carregarPetsDoTutor(tutorId, true);
          petEncontrado = this.petService.meusPets().find((p) => p.id === petId);
        }
      }

      // Se achou o pet, formata os dados para a tela
      if (petEncontrado) {
        this.pet.set({
          ...petEncontrado,
          foto:
            petEncontrado.foto || (petEncontrado.especie?.toLowerCase() === 'gato' ? '🐈' : '🐕'),
          idade: this.calcularIdade(petEncontrado.data_nascimento),
          pesoAtual: petEncontrado.peso_atual ? `${petEncontrado.peso_atual} kg` : 'Não registrado',
          nascimento: this.formatarDataBr(petEncontrado.data_nascimento),
          genero: petEncontrado.genero,
          especie: petEncontrado.especie,
          raca: petEncontrado.raca,
        });
      }

      // 2. Busca o histórico de prontuários (Os Sinais Computados se atualizarão sozinhos aqui)
      await this.carregarHistoricoMedico(petId);
    }

    this.isLoading.set(false);
  }

  /**
   * Puxa os dados da View Segura (sem notas privadas)
   */
  private async carregarHistoricoMedico(petId: string): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('vw_historico_tutor')
      .select('*')
      .eq('pet_id', petId)
      .order('data_resumo', { ascending: false });

    if (error) {
      console.error('Erro ao carregar histórico médico:', error);
      return;
    }

    this.historicoClinico.set((data as ConsultaTutor[]) || []);
  }

  // Cálculos utilitários
  public calcularIdade(dataNascimento: string): string {
    if (!dataNascimento) return 'Idade não informada';
    const nasc = new Date(dataNascimento);
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;

    if (anos < 1) return 'Menos de 1 ano';
    return anos === 1 ? '1 ano' : `${anos} anos`;
  }

  public formatarDataBr(data: string): string {
    if (!data) return 'Não informada';
    const [ano, mes, dia] = data.split('T')[0].split('-');
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
