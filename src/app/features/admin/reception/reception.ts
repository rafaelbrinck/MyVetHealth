import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../../core/services/auth';
import { TutorService } from '../../../core/services/tutor.service';
import { ClinicaService } from '../../../core/services/clinica.service';
import { ConsultaService } from '../../../core/services/consulta.service';
import { Tutor } from '../../../core/models/tutor.model';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reception.html',
  styleUrl: './reception.css',
})
export class ReceptionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  public tutorService = inject(TutorService);
  public clinicaService = inject(ClinicaService);
  public consultaService = inject(ConsultaService);

  public telaAtual = signal<'busca' | 'perfil_tutor' | 'novo_cadastro' | 'agendamento'>('busca');
  public statusBusca = signal<'ocioso' | 'buscando' | 'nao_encontrado'>('ocioso');
  public isSubmitting = signal(false);

  public tutorAtivo = signal<Tutor | null>(null);
  public petsTutor = signal<any[]>([]);
  public petSelecionadoParaConsulta = signal<any>(null);

  public cadastroForm: FormGroup;
  public agendamentoForm: FormGroup;

  public veterinariosClinica = computed(() => {
    return this.clinicaService
      .membrosEquipe()
      .filter((membro) => membro.papel === 'veterinario' && membro.status === 'ativo');
  });

  constructor() {
    this.cadastroForm = this.fb.group({
      nomeTutor: ['', [Validators.required, Validators.minLength(3)]],
      cpf: ['', [Validators.required, Validators.minLength(11)]],
      email: ['', [Validators.required, Validators.email]],
      nomePet: ['', Validators.required],
      especie: ['', Validators.required],
      raca: [''],
      cor: [''],
      dataNascimento: [''],
    });

    this.agendamentoForm = this.fb.group({
      veterinarioId: [''],
      data: ['', Validators.required],
      hora: ['', Validators.required],
      sintomas: [''],
    });
  }

  async ngOnInit() {
    try {
      await this.tutorService.getTutoresComPets();
      await this.clinicaService.carregarMembrosEquipe();
    } catch (error) {
      console.error('Erro ao inicializar recepção:', error);
    }
  }

  public buscarTutor(termo: string): void {
    if (!termo.trim()) return;
    this.statusBusca.set('buscando');

    setTimeout(() => {
      const busca = termo.toLowerCase().trim();

      const encontrado = this.tutorService
        .tutores()
        .find(
          (t) =>
            t.cpf.replace(/\D/g, '').includes(busca.replace(/\D/g, '')) ||
            t.nome.toLowerCase().includes(busca) ||
            t.email.toLowerCase().includes(busca),
        );

      if (encontrado) {
        this.tutorAtivo.set(encontrado);
        this.petsTutor.set(encontrado.pets || []);
        this.statusBusca.set('ocioso');
        this.telaAtual.set('perfil_tutor');
      } else {
        this.statusBusca.set('nao_encontrado');
      }
    }, 600);
  }

  public iniciarConsulta(pet: any): void {
    this.petSelecionadoParaConsulta.set(pet);

    const agora = new Date();
    this.agendamentoForm.patchValue({
      data: agora.toISOString().split('T')[0],
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });

    this.telaAtual.set('agendamento');
  }

  public irParaNovoCadastro(): void {
    this.cadastroForm.reset();
    this.telaAtual.set('novo_cadastro');
  }

  public voltarParaBusca(): void {
    this.telaAtual.set('busca');
    this.statusBusca.set('ocioso');
    this.tutorAtivo.set(null);
    this.petsTutor.set([]);
  }

  public async salvarCadastro() {
    if (this.cadastroForm.invalid) {
      this.cadastroForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const valores = this.cadastroForm.value;
      await this.authService.criarCadastroExpresso(valores);
      await this.tutorService.getTutoresComPets(true);

      alert('🎉 Cadastro e ficha do pet criados com sucesso!');
      this.voltarParaBusca();
    } catch (error: any) {
      console.error('Erro no cadastro expresso:', error);
      alert('Erro: ' + (error.message || 'Falha ao processar cadastro'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  public async salvarAgendamento() {
    if (this.agendamentoForm.invalid) {
      this.agendamentoForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const valores = this.agendamentoForm.value;
      const petId = this.petSelecionadoParaConsulta().id;
      const dataHoraCompleta = new Date(`${valores.data}T${valores.hora}:00`).toISOString();

      await this.consultaService.agendarConsulta({
        petId: petId,
        veterinarioId: valores.veterinarioId || null,
        dataHora: dataHoraCompleta,
        sintomas: valores.sintomas,
      });

      alert(`✅ Consulta agendada com sucesso para ${this.petSelecionadoParaConsulta().nome}!`);
      this.telaAtual.set('perfil_tutor');
    } catch (error: any) {
      console.error('Erro ao agendar consulta:', error);
      alert('Erro: Não foi possível agendar a consulta.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
