import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import {
  CalendarView,
  CalendarEvent,
  CalendarDayViewComponent,
  CalendarMonthViewComponent,
  CalendarWeekViewComponent,
} from 'angular-calendar';

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
} from 'date-fns';
import localePt from '@angular/common/locales/pt';
import { ConsultaService, ConsultaView } from '../../../core/services/consulta.service';
import { ConsultaDetalheComponent } from '../../../shared/consulta-detalhes/consulta-detalhes';

registerLocaleData(localePt);

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [
    CommonModule,
    CalendarMonthViewComponent,
    CalendarWeekViewComponent,
    CalendarDayViewComponent,
    ConsultaDetalheComponent,
  ],
  templateUrl: './calendario.html',
})
export class CalendarioComponent implements OnInit {
  public consultaService = inject(ConsultaService);

  // Controle de Estado da UI usando Signals
  public viewDate = signal<Date>(new Date());
  public view = signal<CalendarView>(CalendarView.Week); // Padrão: Visão Semanal
  public CalendarView = CalendarView; // Expõe o enum para o template
  public consultaAtiva = signal<ConsultaView | null>(null);

  constructor() {
    // Efeito Reativo: Sempre que a data ou a view mudarem, recarregamos os dados do período!
    effect(() => {
      this.carregarDadosDoPeriodo(this.viewDate(), this.view());
    });
  }

  ngOnInit(): void {
    // A carga inicial já será disparada pelo effect
  }

  // --- Métodos de Navegação ---

  mudarVisao(novaVisao: CalendarView) {
    this.view.set(novaVisao);
  }

  hoje() {
    this.viewDate.set(new Date());
  }

  proximo() {
    const atual = this.viewDate();
    if (this.view() === CalendarView.Month) this.viewDate.set(addMonths(atual, 1));
    else if (this.view() === CalendarView.Week) this.viewDate.set(addWeeks(atual, 1));
    else this.viewDate.set(addDays(atual, 1));
  }

  anterior() {
    const atual = this.viewDate();
    if (this.view() === CalendarView.Month) this.viewDate.set(subMonths(atual, 1));
    else if (this.view() === CalendarView.Week) this.viewDate.set(subWeeks(atual, 1));
    else this.viewDate.set(subDays(atual, 1));
  }

  // --- Lógica Anticorrupção & Performance ---

  private carregarDadosDoPeriodo(data: Date, visao: CalendarView) {
    let inicio: Date;
    let fim: Date;

    switch (visao) {
      case CalendarView.Month:
        inicio = startOfMonth(data);
        fim = endOfMonth(data);
        break;
      case CalendarView.Week:
        inicio = startOfWeek(data);
        fim = endOfWeek(data);
        break;
      case CalendarView.Day:
      default:
        inicio = startOfDay(data);
        fim = endOfDay(data);
        break;
    }

    // Busca apenas as consultas que estão na tela atual, poupando processamento e banco
    this.consultaService.carregarAgendaPorPeriodo(inicio, fim);
  }

  // --- Interação do Usuário ---

  aoClicarNoEvento({ event }: { event: CalendarEvent }): void {
    const consultaOriginal = event.meta?.consultaOriginal;
    if (consultaOriginal) {
      this.consultaAtiva.set(consultaOriginal);
    }
  }
}
