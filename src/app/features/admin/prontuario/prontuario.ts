import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ConsultaService, ConsultaView } from '../../../core/services/consulta.service';

interface Medicamento {
  nome: string;
  dosagem: string;
  posologia: string;
}

export interface ProntuarioRascunho {
  peso: string;
  temperatura: string;
  sintomas: string;
  diagnostico: string;
  notas: string;
  medicamentos: Medicamento[];
}

export function chaveRascunhoProntuario(consultaId: string): string {
  return `prontuario-rascunho-${consultaId}`;
}

@Component({
  selector: 'app-prontuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prontuario.html',
  styleUrl: './prontuario.css',
})
export class ProntuarioComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private consultaService = inject(ConsultaService);

  public consultaId: string | null = null;

  public paciente = signal({
    nome: '',
    especie: '',
    raca: '',
    tutor: '',
    idade: 'Idade não informada',
  });

  public rascunho = signal<ProntuarioRascunho>({
    peso: '',
    temperatura: '',
    sintomas: '',
    diagnostico: '',
    notas: '',
    medicamentos: [],
  });

  public isModalOpen = signal(false);
  public consultaAtiva = signal<ConsultaView | null>(null);

  ngOnInit(): void {
    this.consultaId = this.route.snapshot.paramMap.get('id');

    if (this.consultaId) {
      const consultaAtiva = this.consultaService.consultas().find((c) => c.id === this.consultaId);

      if (consultaAtiva) {
        this.inicializarComConsulta(consultaAtiva);
      } else {
        this.executarCargaDeSeguranca(this.consultaId);
      }
    } else {
      alert('⚠️ Nenhum atendimento foi selecionado.');
      this.router.navigate(['/clinica/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.persistirRascunho();
  }

  private inicializarComConsulta(consulta: ConsultaView): void {
    this.mapearDadosPaciente(consulta);
    this.restaurarRascunho();
  }

  private mapearDadosPaciente(consulta: ConsultaView): void {
    this.consultaAtiva.set(consulta);
    this.paciente.set({
      nome: consulta.pet,
      especie: consulta.especie,
      raca: consulta.raca || 'Sem raça definida',
      tutor: consulta.tutor,
      idade: '3 anos',
    });
  }

  private restaurarRascunho(): void {
    if (!this.consultaId) return;

    const salvo = localStorage.getItem(chaveRascunhoProntuario(this.consultaId));
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo) as ProntuarioRascunho;
        this.rascunho.set({
          peso: parsed.peso ?? '',
          temperatura: parsed.temperatura ?? '',
          sintomas: parsed.sintomas ?? '',
          diagnostico: parsed.diagnostico ?? '',
          notas: parsed.notas ?? '',
          medicamentos: parsed.medicamentos ?? [],
        });
        return;
      } catch {
        localStorage.removeItem(chaveRascunhoProntuario(this.consultaId));
      }
    }

    const consulta = this.consultaAtiva();
    this.rascunho.set({
      peso: '',
      temperatura: '',
      sintomas: '',
      diagnostico: '',
      notas: '',
      medicamentos: [],
    });

    if (consulta) {
      this.rascunho.update((atual) => ({
        ...atual,
        sintomas: consulta.sintomas?.trim() ?? atual.sintomas,
      }));
    }
  }

  public persistirRascunho(): void {
    if (!this.consultaId) return;
    localStorage.setItem(chaveRascunhoProntuario(this.consultaId), JSON.stringify(this.rascunho()));
  }

  public atualizarCampo<K extends keyof Omit<ProntuarioRascunho, 'medicamentos'>>(
    campo: K,
    valor: string,
  ): void {
    this.rascunho.update((atual) => ({ ...atual, [campo]: valor }));
    this.persistirRascunho();
  }

  private async executarCargaDeSeguranca(id: string): Promise<void> {
    try {
      await this.consultaService.carregarConsultasDaClinica(true);
      const consultaAtiva = this.consultaService.consultas().find((c) => c.id === id);

      if (consultaAtiva) {
        this.inicializarComConsulta(consultaAtiva);
      } else {
        alert('⚠️ Ficha médica ou consulta não localizada no Supabase.');
        this.router.navigate(['/clinica/dashboard']);
      }
    } catch (error) {
      console.error('Falha crítica na recuperação do prontuário:', error);
    }
  }

  public abrirModal(): void {
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }

  public salvarMedicamento(nome: string, dosagem: string, posologia: string): void {
    if (!nome.trim() || !dosagem.trim()) {
      alert('O Nome e a Dosagem são obrigatórios para a receita!');
      return;
    }

    const novoMed: Medicamento = { nome, dosagem, posologia };
    this.rascunho.update((atual) => ({
      ...atual,
      medicamentos: [...atual.medicamentos, novoMed],
    }));
    this.persistirRascunho();
    this.fecharModal();
  }

  public removerMedicamento(index: number): void {
    this.rascunho.update((atual) => ({
      ...atual,
      medicamentos: atual.medicamentos.filter((_, i) => i !== index),
    }));
    this.persistirRascunho();
  }

  public voltarParaFila(): void {
    this.persistirRascunho();
    this.router.navigate(['/clinica/dashboard']);
  }

  public async finalizarAtendimento(): Promise<void> {
    const { peso, temperatura, sintomas, diagnostico, notas, medicamentos } = this.rascunho();

    if (!sintomas.trim() || !diagnostico.trim()) {
      alert(
        '⚠️ Por favor, preencha pelo menos os Sintomas e o Diagnóstico para salvar o prontuário.',
      );
      return;
    }

    const payloadConsulta = {
      idConsulta: this.consultaId,
      pet: this.paciente().nome,
      sinaisVitais: { peso, temperatura },
      avaliacao: { sintomas, diagnostico, notasPrivadas: notas },
      receituario: medicamentos,
    };

    try {
      if (this.consultaId) {
        await this.consultaService.salvarProntuario(payloadConsulta);
        await this.consultaService.atualizarStatus(this.consultaId, 'aguardando_pagamento');
        localStorage.removeItem(chaveRascunhoProntuario(this.consultaId));
      }

      alert(
        `✅ Prontuário do ${this.paciente().nome} salvo com sucesso!\n\nA consulta foi encaminhada para a recepção aguardando pagamento.`,
      );

      this.router.navigate(['/clinica/dashboard']);
    } catch (error) {
      console.error('Erro ao encerrar atendimento clínico:', error);
      alert(
        '⚠️ Houve um problema ao tentar salvar a ficha no banco de dados. Verifique sua conexão ou as permissões do Supabase.',
      );
    }
  }
}
