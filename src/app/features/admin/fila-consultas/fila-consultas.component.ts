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
} from 'lucide-angular';
import { Auth } from '../../../core/services/auth';
import {
  FilaConsultaItem,
  FilaService,
  UrgenciaAgendamento,
} from '../../../core/services/fila.service';

@Component({
  selector: 'app-fila-consultas',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './fila-consultas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaConsultasComponent implements OnInit {
  private filaService = inject(FilaService);
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

  private agora = signal(Date.now());
  private acaoConsultaId = signal<string | null>(null);

  public carregando = this.filaService.carregando;
  public erro = this.filaService.erro;
  public metricas = this.filaService.metricas;
  public consultasAtivas = this.filaService.consultasAtivas;

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
    if (!this.podeGerenciarAtendimento() || this.acaoConsultaId()) return;

    this.acaoConsultaId.set(item.id);

    try {
      await this.filaService.iniciarAtendimento(item.id);
      this.consultaIniciada.emit(item.id);
      await this.router.navigate(['/clinica/prontuario', item.id]);
    } catch (error) {
      console.error('Falha ao iniciar atendimento', error);
      alert('Não foi possível iniciar o atendimento. Tente novamente.');
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
