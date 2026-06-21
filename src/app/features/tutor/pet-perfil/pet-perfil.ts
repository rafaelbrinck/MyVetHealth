import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule, Building2 } from 'lucide-angular';
import { PetService, ConsultaTutorHistorico } from '../../../core/services/pet.service';
import { SupabaseService } from '../../../core/services/supabase';
import { GeneroPet } from '../../../core/models/pet.model';

interface ConsultaTutor extends ConsultaTutorHistorico {}

interface ClinicaFiltro {
  id: string;
  nome_fantasia: string;
}

@Component({
  selector: 'app-pet-perfil',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './pet-perfil.html',
})
export class PetPerfilComponent implements OnInit {
  public GeneroPet = GeneroPet;
  protected readonly lucideBuilding = Building2;

  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private petService = inject(PetService);
  private supabaseService = inject(SupabaseService);

  public pet = signal<any | null>(null);
  public isLoading = signal(true);
  public historicoClinico = signal<ConsultaTutor[]>([]);
  public filtroClinica = signal<string | null>(null);

  public clinicasDisponiveis = computed<ClinicaFiltro[]>(() => {
    const mapa = new Map<string, ClinicaFiltro>();

    for (const item of this.historicoClinico()) {
      if (!item.clinica_id || !item.clinica?.nome_fantasia) continue;
      mapa.set(item.clinica_id, {
        id: item.clinica_id,
        nome_fantasia: item.clinica.nome_fantasia,
      });
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.nome_fantasia.localeCompare(b.nome_fantasia, 'pt-BR'),
    );
  });

  public historicoFiltrado = computed(() => {
    const clinicaId = this.filtroClinica();
    if (!clinicaId) return this.historicoClinico();
    return this.historicoClinico().filter((item) => item.clinica_id === clinicaId);
  });

  public historicoPesagens = computed(() => {
    return this.historicoClinico()
      .filter((consulta) => consulta.peso != null)
      .map((consulta) => ({
        id: consulta.id,
        data: this.formatarDataBr(consulta.data_resumo),
        peso: consulta.peso,
      }));
  });

  public pesoMaisRecente = computed(() => {
    const pesagens = this.historicoPesagens();
    if (pesagens.length > 0) {
      return `${pesagens[0].peso} kg`;
    }
    return this.pet()?.pesoAtual || 'Não registrado';
  });

  public isMedicineModalOpen = signal(false);
  public selectedMedicine = signal<any | null>(null);
  public isCarteirinhaOpen = signal(false);
  public isShareModalOpen = signal(false);
  public codigoGerado = signal<string | null>(null);

  async ngOnInit() {
    this.isLoading.set(true);
    const petId = this.route.snapshot.paramMap.get('id');

    if (petId) {
      let petEncontrado = this.petService.meusPets().find((p) => p.id === petId);

      if (!petEncontrado) {
        const { data: session } = await this.supabaseService.client.auth.getSession();
        const tutorId = session.session?.user?.id;

        if (tutorId) {
          await this.petService.carregarPetsDoTutor(tutorId, true);
          petEncontrado = this.petService.meusPets().find((p) => p.id === petId);
        }
      }

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

      await this.carregarHistoricoMedico(petId);
    }

    this.isLoading.set(false);
  }

  private async carregarHistoricoMedico(petId: string): Promise<void> {
    try {
      const historico = await this.petService.carregarHistoricoMedicoPet(petId);
      this.historicoClinico.set(historico);
    } catch (error) {
      console.error('Erro ao carregar histórico médico:', error);
    }
  }

  public definirFiltroClinica(clinicaId: string | null): void {
    this.filtroClinica.set(clinicaId);
  }

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
