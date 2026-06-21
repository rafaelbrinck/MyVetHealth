import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

const TOAST_DURATION_MS = 4000;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private _toasts = signal<Toast[]>([]);

  public toasts = this._toasts.asReadonly();

  showSuccess(message: string): void {
    this.show(message, 'success');
  }

  showError(message: string): void {
    this.show(message, 'error');
  }

  dismiss(id: string): void {
    this._toasts.update((lista) => lista.filter((toast) => toast.id !== id));
  }

  private show(message: string, type: Toast['type']): void {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type };

    this._toasts.update((lista) => [...lista, toast]);

    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}
