import {
  Component,
  input,
  output,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConsultaView } from '../../../../core/services/consulta.service';
import { FaturamentoService, MetodoPagamento } from '../../../../core/services/faturamento.service';

const METODOS_PAGAMENTO: { valor: MetodoPagamento; label: string }[] = [
  { valor: 'pix', label: 'PIX' },
  { valor: 'cartao_credito', label: 'Cartão de Crédito' },
  { valor: 'cartao_debito', label: 'Cartão de Débito' },
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'transferencia', label: 'Transferência' },
];

@Component({
  selector: 'app-checkout-consulta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout-consulta.component.html',
})
export class CheckoutConsultaComponent implements OnInit {
  consulta = input.required<ConsultaView>();
  fechar = output<void>();
  pagamentoConcluido = output<void>();

  private fb = inject(FormBuilder);
  private faturamentoService = inject(FaturamentoService);
  private destroyRef = inject(DestroyRef);

  public metodosDisponiveis = METODOS_PAGAMENTO;
  public pagamentoForm!: FormGroup;
  private _somaMetodos = signal(0);

  public valorTotal = computed(() => this.consulta().valor_servico ?? 0);
  public somaMetodos = this._somaMetodos.asReadonly();
  public restante = computed(() => this.valorTotal() - this._somaMetodos());
  public pagamentoValido = computed(
    () => Math.abs(this.restante()) < 0.01 && this.metodosArray.length > 0,
  );
  public processando = this.faturamentoService.processando;

  ngOnInit(): void {
    this.pagamentoForm = this.fb.group({
      metodos: this.fb.array([this.criarMetodoGroup()]),
    });

    this.metodosArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.atualizarSoma();
    });

    this.atualizarSoma();
  }

  get metodosArray(): FormArray {
    return this.pagamentoForm.get('metodos') as FormArray;
  }

  private criarMetodoGroup(): FormGroup {
    return this.fb.group({
      metodo: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  public adicionarMetodo(): void {
    this.metodosArray.push(this.criarMetodoGroup());
  }

  public removerMetodo(index: number): void {
    if (this.metodosArray.length <= 1) return;
    this.metodosArray.removeAt(index);
  }

  public campoInvalido(controle: AbstractControl | null): boolean {
    return !!controle && controle.invalid && controle.touched;
  }

  private atualizarSoma(): void {
    const soma = this.metodosArray.controls.reduce((acc, ctrl) => {
      const valor = Number(ctrl.get('valor')?.value) || 0;
      return acc + valor;
    }, 0);
    this._somaMetodos.set(soma);
  }

  public async confirmarPagamento(): Promise<void> {
    if (this.pagamentoForm.invalid || !this.pagamentoValido()) {
      this.pagamentoForm.markAllAsTouched();
      return;
    }

    const metodos = this.metodosArray.value.map(
      (m: { metodo: MetodoPagamento; valor: number }) => ({
        metodo: m.metodo,
        valor: Number(m.valor),
      }),
    );

    try {
      await this.faturamentoService.processarPagamento({
        tipo: 'receita',
        consultaId: this.consulta().id,
        valorTotal: this.valorTotal(),
        descricao: this.consulta().servico || 'Consulta veterinária',
        metodos,
      });

      this.pagamentoConcluido.emit();
    } catch (error: unknown) {
      console.error('Erro ao processar pagamento:', error);
      const mensagem =
        error instanceof Error ? error.message : 'Não foi possível registrar o pagamento.';
      alert(`⚠️ ${mensagem}`);
    }
  }
}
