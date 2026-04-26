import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-dashboard.html',
  styleUrl: './tutor-dashboard.css'
})
export class TutorDashboardComponent {
  
  // Dados do Tutor
  public tutor = signal({
    nome: 'João da Silva',
    saudacao: this.obterSaudacao()
  });

  // Simulando um alerta importante (ex: vacina ou consulta)
  public alertaImportante = signal({
    tipo: 'vacina',
    mensagem: 'A vacina V10 do Max vence em 5 dias!',
    acaoTexto: 'Ver Detalhes',
    ativo: true
  });

  // Lista resumida de Pets
  public meusPets = signal([
    { id: 1, nome: 'Max', especie: 'Cachorro', raca: 'Golden Retriever', foto: '🐕' },
    { id: 2, nome: 'Mia', especie: 'Gato', raca: 'Siamês', foto: '🐈' }
  ]);

  // Função simples para dar "Bom dia", "Boa tarde" ou "Boa noite"
  private obterSaudacao(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }
}