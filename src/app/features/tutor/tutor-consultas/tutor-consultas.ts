import { Component, signal, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-tutor-consultas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-consultas.html'
})
export class TutorConsultasComponent {
  
  private location = inject(Location);

  public consultas = signal([
    { id: 1, pet: 'Max', data: '12/05/2026', hora: '14:30', vet: 'Dra. Eduarda', status: 'Agendada' },
    { id: 2, pet: 'Mia', data: '10/03/2026', hora: '10:00', vet: 'Dr. Gustavo', status: 'Concluída' },
    { id: 3, pet: 'Max', data: '15/01/2026', hora: '09:15', vet: 'Dr. Danton', status: 'Concluída' }
  ]);

  public voltar(): void {
    this.location.back();
  }
}