import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tutor-prontuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-prontuario.html'
})
export class TutorProntuarioComponent implements OnInit {
  private location = inject(Location);
  private route = inject(ActivatedRoute);

  public prontuario = signal({
    id: 101,
    codigoAutenticidade: 'PRT-2026-A8F9X',
    clinica: 'MyVetHealth Matriz',
    data: '12/05/2026',
    hora: '14:30',
    pet: 'Max',
    especie: 'Cachorro (Golden Retriever)',
    vet: 'Dra. Eduarda Toppor',
    crmv: 'CRMV-RS 12345',
    peso: '25.5 kg',
    motivo: 'Check-up e Vacinação',
    anamnese: 'Tutor relata que paciente está ativo, alimentando-se bem e sem alterações na urina ou fezes. Veio para atualização do calendário vacinal.',
    exameFisico: 'Mucosas normocoradas, linfonodos reativos ausentes. Frequência cardíaca e respiratória dentro dos padrões. Sem dor à palpação abdominal.',
    diagnostico: 'Paciente hígido (Saudável).',
    prescricao: '1. Aplicação de Vacina V10 (Dose única anual).\n2. Manter dieta super premium.\n3. Retorno em 1 ano ou em caso de alterações.'
  });

  ngOnInit() {}

  public voltar(): void { this.location.back(); }
  public imprimirProntuario(): void { window.print(); }
}