import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  CreditCard,
} from 'lucide-angular';
import {
  FaturamentoDashboardView,
  FaturamentoService,
  PeriodoFiltro,
  StatusFaturamento,
} from '../../../core/services/faturamento.service';

interface MesOpcao {
  valor: number;
  label: string;
}

@Component({
  selector: 'app-faturamento',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './faturamento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaturamentoComponent implements OnInit {
  private faturamentoService = inject(FaturamentoService);

  protected readonly lucideDollarSign = DollarSign;
  protected readonly lucideTrendingUp = TrendingUp;
  protected readonly lucideCalendar = Calendar;
  protected readonly lucideAlertCircle = AlertCircle;
  protected readonly lucideCreditCard = CreditCard;

  public isLoading = signal(true);
  public erro = signal<string | null>(null);
  public periodoMes = signal(new Date().getMonth() + 1);
  public periodoAno = signal(new Date().getFullYear());

  public kpis = this.faturamentoService.kpis;
  public faturamentos = this.faturamentoService.faturamentos;

  public meses: MesOpcao[] = [
    { valor: 1, label: 'Janeiro' },
    { valor: 2, label: 'Fevereiro' },
    { valor: 3, label: 'Março' },
    { valor: 4, label: 'Abril' },
    { valor: 5, label: 'Maio' },
    { valor: 6, label: 'Junho' },
    { valor: 7, label: 'Julho' },
    { valor: 8, label: 'Agosto' },
    { valor: 9, label: 'Setembro' },
    { valor: 10, label: 'Outubro' },
    { valor: 11, label: 'Novembro' },
    { valor: 12, label: 'Dezembro' },
  ];

  public anos = computed(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => anoAtual - index);
  });

  public periodoLabel = computed(() => {
    const mes = this.meses.find((item) => item.valor === this.periodoMes())?.label ?? '';
    return `${mes} de ${this.periodoAno()}`;
  });

  async ngOnInit(): Promise<void> {
    await this.carregarDados();
  }

  public async onPeriodoChange(): Promise<void> {
    await this.carregarDados();
  }

  public badgeStatusClasses(status: StatusFaturamento): string {
    switch (status) {
      case 'pago':
        return 'bg-teal-50 text-[#0b8a7a] border-teal-200 dark:bg-teal-950/40 dark:text-emerald-300 dark:border-teal-800/50';
      case 'pendente':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50';
    }
  }

  public trackFaturamento(_index: number, item: FaturamentoDashboardView): string {
    return item.id;
  }

  private async carregarDados(): Promise<void> {
    this.isLoading.set(true);
    this.erro.set(null);

    const periodo: PeriodoFiltro = {
      mes: this.periodoMes(),
      ano: this.periodoAno(),
    };

    try {
      await this.faturamentoService.carregarAnaliseFinanceira(periodo);
    } catch (error) {
      console.error('Erro ao carregar análise financeira:', error);
      this.erro.set('Não foi possível carregar os dados de faturamento do período selecionado.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
