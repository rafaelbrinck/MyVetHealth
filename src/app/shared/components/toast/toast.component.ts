import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideAngularModule,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-angular';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private toastService = inject(ToastService);

  protected readonly lucideCheckCircle = CheckCircle;
  protected readonly lucideAlertCircle = AlertCircle;
  protected readonly lucideX = X;

  public toasts = this.toastService.toasts;

  fechar(id: string): void {
    this.toastService.dismiss(id);
  }

  classesPorTipo(type: 'success' | 'error'): string {
    if (type === 'success') {
      return 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-800/60';
    }

    return 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/90 dark:text-red-100 dark:border-red-800/60';
  }
}
