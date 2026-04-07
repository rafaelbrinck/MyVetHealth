import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-equipe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './equipe.html',
  styleUrl: './equipe.css'
})
export class EquipeComponent {
  
  // Mock simulando o join entre 'equipe_clinica' e 'perfis'
  public membrosEquipe = signal([
    { id: 1, nome: 'Rafael (Tech Lead)', papel: 'admin_clinica', crmv: null, email: 'rafael@myvethealth.com', ativo: true },
    { id: 2, nome: "Dra. Juliana D'avila", papel: 'veterinario', crmv: 'CRMV-RS 12345', email: 'juliana@myvethealth.com', ativo: true },
    { id: 3, nome: 'Dr. Pedro Brum', papel: 'veterinario', crmv: 'CRMV-RS 67890', email: 'pedro@myvethealth.com', ativo: true },
    { id: 4, nome: 'Bárbara Brunetto', papel: 'recepcionista', crmv: null, email: 'barbara@myvethealth.com', ativo: true },
    { id: 5, nome: 'Dr. Francisco Ghisio', papel: 'veterinario', crmv: 'CRMV-RS 54321', email: 'francisco@myvethealth.com', ativo: false } // Membro inativo
  ]);

  public abrirModalConvite(): void {
    alert('Aqui abriremos o modal para disparar o e-mail de convite via Supabase Auth!');
  }
}