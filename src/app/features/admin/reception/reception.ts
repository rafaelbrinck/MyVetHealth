import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../../core/services/auth';
import { TutorService } from '../../../core/services/tutor.service';
import { ClinicaService } from '../../../core/services/clinica.service';
import { ConsultaService, ConsultaView, StatusConsulta } from '../../../core/services/consulta.service';
import { Tutor } from '../../../core/models/tutor.model';
import { ServicosService } from '../../../core/services/servicos-clinica';
import { FaturamentoService } from '../../../core/services/faturamento.service';
import { ToastService } from '../../../core/services/toast.service';
import { CheckoutConsultaComponent } from './checkout-consulta/checkout-consulta.component';

type TipoEntradaConsulta = Extract<StatusConsulta, 'aguardando' | 'agendada'>;

interface AgendamentoFormValue {
  veterinarioId: string;
  data: string;
  hora: string;
  servicoId: string;
  sintomas: string;
  status: TipoEntradaConsulta;
}

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CheckoutConsultaComponent],
  templateUrl: './reception.html',
  styleUrl: './reception.css',
})
export class ReceptionComponent implements OnInit {
  public servicosService = inject(ServicosService);
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  public tutorService = inject(TutorService);
  public clinicaService = inject(ClinicaService);
  public consultaService = inject(ConsultaService);
  public faturamentoService = inject(FaturamentoService);
  private toastService = inject(ToastService);

  public telaAtual = signal<'busca' | 'perfil_tutor' | 'novo_cadastro' | 'agendamento'>('busca');
  public consultaCheckout = signal<ConsultaView | null>(null);
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

  public servicosClinica = computed(() => {
    return this.servicosService.servicos().filter((servico) => servico.ativo);
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
      telefone: ['', [Validators.required, Validators.minLength(10)]],
      genero: ['', Validators.required],
    });

    this.agendamentoForm = this.fb.nonNullable.group({
      veterinarioId: [''],
      data: ['', Validators.required],
      hora: ['', Validators.required],
      servicoId: ['', Validators.required],
      sintomas: [''],
      status: ['aguardando' as TipoEntradaConsulta, Validators.required],
    });
  }

  public definirTipoEntrada(status: TipoEntradaConsulta): void {
    this.agendamentoForm.patchValue({ status });
  }

  public tipoEntradaSelecionado(): TipoEntradaConsulta {
    return this.agendamentoForm.get('status')?.value ?? 'aguardando';
  }

  async ngOnInit() {
    try {
      await Promise.all([
        this.tutorService.getTutoresComPets(),
        this.clinicaService.carregarMembrosEquipe(),
        this.servicosService.carregarServicos(),
        this.consultaService.carregarConsultasDaClinica(true),
        this.faturamentoService.carregarFaturamentoDoDia(),
      ]);
    } catch (error) {
      console.error('Erro ao inicializar recepção:', error);
    }
  }

  public abrirCheckout(consulta: ConsultaView): void {
    this.consultaCheckout.set(consulta);
  }

  public fecharCheckout(): void {
    this.consultaCheckout.set(null);
  }

  public onPagamentoConcluido(): void {
    this.consultaCheckout.set(null);
    this.toastService.showSuccess('Pagamento registrado com sucesso! A consulta foi finalizada.');
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
      status: 'aguardando',
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

      this.toastService.showSuccess('Cadastro e ficha do pet criados com sucesso!');
      this.voltarParaBusca();
    } catch (error: any) {
      console.error('Erro no cadastro expresso:', error);
      this.toastService.showError(error.message || 'Falha ao processar cadastro');
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
      const valores = this.agendamentoForm.getRawValue() as AgendamentoFormValue;
      const petId = this.petSelecionadoParaConsulta().id;
      const dataHoraCompleta = new Date(`${valores.data}T${valores.hora}:00`).toISOString();
      const petNome = this.petSelecionadoParaConsulta().nome;

      await this.consultaService.agendarConsulta({
        petId: petId,
        veterinarioId: valores.veterinarioId || null,
        dataHora: dataHoraCompleta,
        sintomas: valores.sintomas,
        servicoId: valores.servicoId,
        status: valores.status,
      });

      if (valores.status === 'aguardando') {
        this.toastService.showSuccess(`${petNome} entrou na fila de encaixe!`);
      } else {
        this.toastService.showSuccess(`Horário marcado com sucesso para ${petNome}!`);
      }
      this.telaAtual.set('perfil_tutor');
    } catch (error: any) {
      console.error('Erro ao agendar consulta:', error);
      this.toastService.showError('Não foi possível agendar a consulta.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
