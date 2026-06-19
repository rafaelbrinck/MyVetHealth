import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router'; // 🔄 Injetado ActivatedRoute para parâmetros
import { ConsultaService, ConsultaView } from '../../../core/services/consulta.service';

interface Medicamento {
  nome: string;
  dosagem: string;
  posologia: string;
}

@Component({
  selector: 'app-prontuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prontuario.html',
  styleUrl: './prontuario.css',
})
export class ProntuarioComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute); // 🔄 Capturador de rotas ativas
  private consultaService = inject(ConsultaService); // 🔄 Motor de dados

  // Guarda o identificador do atendimento ativo
  public consultaId: string | null = null;

  // 🔄 Estado reativo inicializado dinamicamente limpo
  public paciente = signal({
    nome: '',
    especie: '',
    raca: '',
    tutor: '',
    idade: 'Idade não informada', // Será alimentada pelas tabelas estendidas futuramente
  });

  public medicamentosReceita = signal<Medicamento[]>([]);
  public isModalOpen = signal(false);
  public consultaAtiva = signal<ConsultaView | null>(null);

  ngOnInit(): void {
    // 1. Extrai o ID contido no parâmetro da URL (/clinica/prontuarios/:id)
    this.consultaId = this.route.snapshot.paramMap.get('id');

    if (this.consultaId) {
      // 2. Tenta recuperar a consulta direto do cache central de Signals
      const consultaAtiva = this.consultaService.consultas().find((c) => c.id === this.consultaId);

      if (consultaAtiva) {
        this.mapearDadosPaciente(consultaAtiva);
      } else {
        // 3. Fallback anticrash: se o profissional der F5, recarrega a base do Supabase
        this.executarCargaDeSeguranca(this.consultaId);
      }
    } else {
      alert('⚠️ Nenhum atendimento foi selecionado.');
      this.router.navigate(['/clinica/dashboard']);
    }
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

  /** Método auxiliar executado em caso de recarregamento brusco de tela (F5) */
  private async executarCargaDeSeguranca(id: string): Promise<void> {
    try {
      await this.consultaService.carregarConsultasDaClinica(true);
      const consultaAtiva = this.consultaService.consultas().find((c) => c.id === id);

      if (consultaAtiva) {
        this.mapearDadosPaciente(consultaAtiva);
      } else {
        alert('⚠️ Ficha médica ou consulta não localizada no Supabase.');
        this.router.navigate(['/clinica/dashboard']);
      }
    } catch (error) {
      console.error('Falha crítica na recuperação do prontuário:', error);
    }
  }

  // ==========================================
  // CONTROLES DO MODAL DE RECEITUÁRIO
  // ==========================================

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
    this.medicamentosReceita.update((lista) => [...lista, novoMed]);
    this.fecharModal();
  }

  public removerMedicamento(index: number): void {
    this.medicamentosReceita.update((lista) => lista.filter((_, i) => i !== index));
  }

  // ==========================================
  // FINALIZAÇÃO DO ATENDIMENTO
  // ==========================================

  /**
   * Empacota as anotações clínicas e fecha o atendimento médico
   */
  public async finalizarAtendimento(
    peso: string,
    temp: string,
    sintomas: string,
    diagnostico: string,
    notas: string,
  ): Promise<void> {
    if (!sintomas.trim() || !diagnostico.trim()) {
      alert(
        '⚠️ Por favor, preencha pelo menos os Sintomas e o Diagnóstico para salvar o prontuário.',
      );
      return;
    }

    const payloadConsulta = {
      idConsulta: this.consultaId,
      pet: this.paciente().nome,
      sinaisVitais: { peso, temperatura: temp },
      avaliacao: { sintomas, diagnostico, notasPrivadas: notas },
      receituario: this.medicamentosReceita(),
    };

    console.log('🚀 Gravando informações no banco e notificando tutor...', payloadConsulta);

    try {
      if (this.consultaId) {
        // 1. PRIMEIRO: Gravamos o histórico clínico com todos os dados da tela
        await this.consultaService.salvarProntuario(payloadConsulta);

        await this.consultaService.atualizarStatus(this.consultaId, 'aguardando_pagamento');
      }

      alert(
        `✅ Prontuário do ${this.paciente().nome} salvo com sucesso!\n\nA consulta foi encaminhada para a recepção aguardando pagamento.`,
      );

      // 4. Limpa o painel e retorna o médico à listagem principal do Dashboard
      this.router.navigate(['/clinica/dashboard']);
    } catch (error) {
      console.error('Erro ao encerrar atendimento clínico:', error);
      alert(
        '⚠️ Houve um problema ao tentar salvar a ficha no banco de dados. Verifique sua conexão ou as permissões do Supabase.',
      );
    }
  }
}
