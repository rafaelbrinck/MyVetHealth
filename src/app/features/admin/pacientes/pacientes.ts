import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TutorService } from '../../../core/services/tutor.service'; // Ajuste o caminho se necessário
import { Tutor } from '../../../core/models/tutor.model';
import { Pet, CriarPetDTO } from '../../../core/models/pet.model';
import { ClinicaService } from '../../../core/services/clinica.service';
import { PetService } from '../../../core/services/pet.service';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // <-- Adicionado ReactiveFormsModule
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class PacientesComponent implements OnInit {
  private router = inject(Router);
  public tutorService = inject(TutorService);
  public clinicaService = inject(ClinicaService);
  public petService = inject(PetService);
  private fb = inject(FormBuilder); // <-- Injeção do FormBuilder

  // ==========================================
  // ESTADOS DA TELA (View Switcher)
  // ==========================================
  // <-- Adicionado 'novo_pet' nas opções do Signal
  public telaAtual = signal<'lista_tutores' | 'lista_pets' | 'novo_pet'>('lista_tutores');
  public tutorSelecionado = signal<Tutor | null>(null);
  public termoBusca = signal('');

  // ==========================================
  // FORMULÁRIO REATIVO
  // ==========================================
  public petForm: FormGroup = this.fb.group({
    nome: ['', Validators.required],
    especie: ['', Validators.required],
    raca: [''],
    cor: [''],
    data_nascimento: [''],
  });

  // ==========================================
  // INICIALIZAÇÃO COM CACHE
  // ==========================================
  ngOnInit() {
    this.tutorService.getTutoresComPets().catch((error) => {
      if (error.message && error.message.includes('no longer runnable')) return;
      console.error('Erro ao carregar pacientes:', error);
    });
  }

  // ==========================================
  // BUSCA INTELIGENTE
  // ==========================================
  public tutoresFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    const lista = this.tutorService.tutores();

    if (!termo) return lista;

    return lista.filter(
      (tutor) =>
        tutor.nome.toLowerCase().includes(termo) ||
        tutor.cpf.replace(/\D/g, '').includes(termo.replace(/\D/g, '')) ||
        tutor.pets?.some((pet) => pet.nome.toLowerCase().includes(termo)),
    );
  });

  public aoDigitar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }

  // ==========================================
  // NAVEGAÇÃO INTERNA
  // ==========================================
  public abrirPetsDoTutor(tutor: Tutor): void {
    this.tutorSelecionado.set(tutor);
    this.termoBusca.set('');
    this.telaAtual.set('lista_pets');
  }

  public voltarParaTutores(): void {
    this.tutorSelecionado.set(null);
    this.telaAtual.set('lista_tutores');
  }

  public abrirFormularioNovoPet(): void {
    this.petForm.reset(); // Limpa sujeiras de formulários anteriores
    this.telaAtual.set('novo_pet');
  }

  public voltarParaPets(): void {
    this.telaAtual.set('lista_pets');
  }

  // ==========================================
  // AÇÕES
  // ==========================================
  public iniciarAtendimento(pet: any): void {
    console.log('Navegando para prontuários... Paciente:', pet.nome);
    this.router.navigate(['/clinica/prontuarios']);
  }

  public verHistorico(pet: any): void {
    alert(`Preparando o histórico médico do paciente: ${pet.nome} 🐾`);
  }

  public async salvarNovoPet(): Promise<void> {
    if (this.petForm.invalid) {
      this.petForm.markAllAsTouched();
      return;
    }

    const tutorId = this.tutorSelecionado()?.id;
    const clinicaId = this.clinicaService.clinicaAtivaId;

    if (!tutorId || !clinicaId) {
      console.error('Falha de segurança: Tutor ou Clínica não identificados.');
      alert('Ocorreu um erro de contexto. Tente acessar o tutor novamente.');
      return;
    }

    const formValues = this.petForm.value;
    const petData: CriarPetDTO = {
      ...formValues,
      tutor_id: tutorId,
      clinica_id: clinicaId,
      data_nascimento: formValues.data_nascimento ? formValues.data_nascimento : null,
    };

    try {
      const petCriadoNoBanco = await this.petService.addPet(petData);

      this.tutorSelecionado.update((tutorAtual) => {
        if (!tutorAtual) return tutorAtual;

        const petsAtualizados = tutorAtual.pets
          ? [...tutorAtual.pets, petCriadoNoBanco]
          : [petCriadoNoBanco];

        return { ...tutorAtual, pets: petsAtualizados };
      });

      this.petForm.reset();
      this.voltarParaPets();
    } catch (error) {
      console.error('Erro na interface ao adicionar novo pet:', error);
      alert('Houve uma falha ao salvar o paciente. Verifique sua conexão e tente novamente.');
    }
  }
}
