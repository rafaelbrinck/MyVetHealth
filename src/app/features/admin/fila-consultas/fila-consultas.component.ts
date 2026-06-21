import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  Clock,
  AlertTriangle,
  User,
  Play,
  CheckCircle,
  RefreshCw,
  Calendar,
  FileText,
  UserCheck,
  ChevronDown,
} from 'lucide-angular';
import { Auth } from '../../../core/services/auth';
import {
  FilaConsultaItem,
  FilaService,
  UrgenciaAgendamento,
} from '../../../core/services/fila.service';
import { StatusConsulta } from '../../../core/services/consulta.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-fila-consultas',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './fila-consultas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaConsultasComponent implements OnInit {
  private filaService = inject(FilaService);
  private toastService = inject(ToastService);
  private auth = inject(Auth);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  consultaIniciada = output<string>();

  protected readonly lucideClock = Clock;
  protected readonly lucideAlertTriangle = AlertTriangle;
  protected readonly lucideUser = User;
  protected readonly lucidePlay = Play;
  protected readonly lucideCheckCircle = CheckCircle;
  protected readonly lucideRefreshCw = RefreshCw;
  protected readonly lucideCalendar = Calendar;
  protected readonly lucideFileText = FileText;
  protected readonly lucideUserCheck = UserCheck;
  protected readonly lucideChevronDown = ChevronDown;

  private agora = signal(Date.now());
  private acaoConsultaId = signal<string | null>(null);
  public horariosMarcadosAbertos = signal(false);

  public carregando = this.filaService.carregando;
  public erro = this.filaService.erro;
  public metricas = this.filaService.metricas;
  public consultasAtivas = this.filaService.consultasAtivas;
  public consultasAgendadas = this.filaService.consultasAgendadas;

  public filaComEspera = computed(() => {
    const referencia = new Date(this.agora());
    return this.filaService.filaAguardando().map((item) => ({
      ...item,
      minutosEspera: this.filaService.calcularMinutosEspera(item, referencia),
    }));
  });

  public podeGerenciarAtendimento = computed(() => {
    const papel = this.auth.getUserRoleValue();
    return papel === 'veterinario' || papel === 'admin_clinica';
  });

  public podeConfirmarChegada = computed(() => {
    const papel = this.auth.getUserRoleValue();
    return papel === 'veterinario' || papel === 'admin_clinica' || papel === 'recepcionista';
  });

  async ngOnInit(): Promise<void> {
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.agora.set(Date.now()));

    await this.filaService.carregarFilaDoDia(true);
  }

  async recarregar(): Promise<void> {
    await this.filaService.carregarFilaDoDia(true);
  }

  async iniciarAtendimento(item: FilaConsultaItem): Promise<void> {
    if (!this.podeGerenciarAtendimento() || this.acaoConsultaId() || item.status !== 'aguardando') {
      return;
    }

    this.acaoConsultaId.set(item.id);

    try {
      await this.filaService.iniciarAtendimento(item.id);
      this.consultaIniciada.emit(item.id);
      await this.router.navigate(['/clinica/prontuario', item.id]);
    } catch (error) {
      console.error('Falha ao iniciar atendimento', error);
      this.toastService.showError('Não foi possível iniciar o atendimento. Tente novamente.');
    } finally {
      this.acaoConsultaId.set(null);
    }
  }

  async confirmarChegadaNaFila(item: FilaConsultaItem): Promise<void> {
    if (!this.podeConfirmarChegada() || this.acaoConsultaId() || item.status !== 'agendada') {
      return;
    }

    this.acaoConsultaId.set(item.id);

    try {
      await this.filaService.confirmarChegadaNaFila(item.id);
      this.toastService.showSuccess(`${item.petNome} entrou na fila de atendimento.`);
    } catch (error) {
      console.error('Falha ao confirmar chegada', error);
      this.toastService.showError('Não foi possível enviar o paciente para a fila. Tente novamente.');
    } finally {
      this.acaoConsultaId.set(null);
    }
  }

  continuarAtendimento(item: FilaConsultaItem): void {
    if (!this.podeGerenciarAtendimento()) return;
    this.router.navigate(['/clinica/prontuario', item.id]);
  }

  temRascunhoSalvo(consultaId: string): boolean {
    return !!localStorage.getItem(`prontuario-rascunho-${consultaId}`);
  }

  verAgendaCompleta(): void {
    this.router.navigate(['/clinica/calendario']);
  }

  alternarHorariosMarcados(): void {
    this.horariosMarcadosAbertos.update((aberto) => !aberto);
  }

  formatarTempoEspera(minutos: number): string {
    if (minutos < 1) return 'Aguardando';
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
  }

  badgeUrgenciaClasses(urgencia: UrgenciaAgendamento): string {
    switch (urgencia) {
      case 'emergencia':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60';
      case 'prioridade':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600';
    }
  }

  badgeStatusClasses(status: StatusConsulta): string {
    switch (status) {
      case 'agendada':
        return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700/60';
      case 'aguardando':
        return 'bg-teal-50/80 text-teal-800 border-2 border-teal-300 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-600/70';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600';
    }
  }

  labelStatusEntrada(item: FilaConsultaItem): string {
    if (item.status === 'agendada') {
      return `Agendado · ${item.horarioAgendado}`;
    }
    return 'Fila / Encaixe';
  }

  cardEntradaClasses(status: StatusConsulta): string {
    if (status === 'agendada') {
      return 'border-sky-200 dark:border-sky-800/50 bg-sky-50/25 dark:bg-sky-950/10';
    }
    return 'border-teal-200 dark:border-teal-800/40 bg-teal-50/20 dark:bg-teal-950/10';
  }

  rotuloHorarioContextual(item: FilaConsultaItem): string {
    if (item.status === 'agendada') {
      return `Horário marcado: ${item.horarioAgendado}`;
    }
    return `Chegou às ${item.horarioAgendado}`;
  }

  labelUrgencia(urgencia: UrgenciaAgendamento): string {
    switch (urgencia) {
      case 'emergencia':
        return 'Emergência';
      case 'prioridade':
        return 'Prioridade';
      default:
        return 'Normal';
    }
  }

  iconeEspecie(especie: string): string {
    const valor = especie.toLowerCase();
    if (valor.includes('cach') || valor.includes('dog')) return '🐕';
    if (valor.includes('gat') || valor.includes('cat')) return '🐈';
    return '🐾';
  }

  estaProcessando(id: string): boolean {
    return this.acaoConsultaId() === id;
  }
}
