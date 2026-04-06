import { Component, signal } from '@angular/core'; // Importamos o 'signal'
import { CommonModule } from '@angular/common'; // Necessário para o *ngIf

@Component({
  selector: 'app-reception',
  standalone: true,
  // Como estamos no padrão Feature-Sliced Design simplificado, importamos apenas o necessário aqui
  imports: [CommonModule],
  templateUrl: './reception.html',
  styleUrl: './reception.css'
})
export class ReceptionComponent {
  
  // Usamos um Signal para controlar a visibilidade do modal de cadastro (booleano).
  // É o padrão mais moderno e performático do Angular 17+ para estado local simples.
  public isModalOpen = signal(false);

  /**
   * Abre o Modal de Onboarding Mágico
   */
  public abrirModal(): void {
    this.isModalOpen.set(true);
  }

  /**
   * Fecha o Modal
   */
  public fecharModal(): void {
    this.isModalOpen.set(false);
  }
}