import { Component, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-tutor-historico',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-historico.html'
})
export class TutorHistoricoComponent {
  private location = inject(Location);
  private router = inject(Router);

  public clinicas = signal([
    { id: 1, nome: 'MyVetHealth Matriz', endereco: 'Centro, Porto Alegre', logo: 'M' },
    { id: 2, nome: 'Clínica Especialista Vet', endereco: 'Moinhos de Vento, Porto Alegre', logo: 'C' }
  ]);

  public prontuarios = signal([
    { id: 101, clinicaId: 1, pet: 'Max', data: '12/05/2026', vet: 'Dra. Eduarda Toppor', motivo: 'Check-up e Vacinação' },
    { id: 102, clinicaId: 1, pet: 'Mia', data: '10/03/2026', vet: 'Dr. Gustavo Leite', motivo: 'Gastroenterite' },
    { id: 103, clinicaId: 2, pet: 'Max', data: '05/01/2026', vet: 'Dr. Dermatologista', motivo: 'Alergia de pele severa' }
  ]);

  public clinicaSelecionada = signal<number>(1);

  get prontuariosFiltrados() {
    return this.prontuarios().filter(p => p.clinicaId === this.clinicaSelecionada());
  }

  public selecionarClinica(id: number): void {
    this.clinicaSelecionada.set(id);
  }

  public abrirProntuario(id: number): void {
    this.router.navigate(['/tutor/prontuario', id]);
  }

  public voltar(): void {
    this.location.back();
  }
}