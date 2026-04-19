import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TutorService } from '../../../core/services/tutor.service'; // Ajuste o caminho se necessário
import { Tutor } from '../../../core/models/tutor.model';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class PacientesComponent implements OnInit {
  private router = inject(Router);
  public tutorService = inject(TutorService);

  // ==========================================
  // ESTADOS DA TELA (View Switcher)
  // ==========================================
  public telaAtual = signal<'lista_tutores' | 'lista_pets'>('lista_tutores');
  public tutorSelecionado = signal<Tutor | null>(null);
  public termoBusca = signal('');

  // ==========================================
  // INICIALIZAÇÃO COM CACHE
  // ==========================================
  ngOnInit() {
    // Busca os tutores usando o cache inteligente (não sobrecarrega o banco)
    this.tutorService.getTutoresComPets().catch((error) => {
      if (error.message && error.message.includes('no longer runnable')) return;
      console.error('Erro ao carregar pacientes:', error);
    });
  }

  // ==========================================
  // BUSCA INTELIGENTE
  // ==========================================
  public tutoresFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    const lista = this.tutorService.tutores(); // Lê do Signal do Serviço

    if (!termo) return lista;

    return lista.filter(
      (tutor) =>
        // Busca pelo nome do tutor
        tutor.nome.toLowerCase().includes(termo) ||
        // Busca pelo CPF (ignorando pontos e traços)
        tutor.cpf.replace(/\D/g, '').includes(termo.replace(/\D/g, '')) ||
        // MÁGICA: Se o nome de algum pet bater, mostra o tutor dono dele!
        tutor.pets?.some((pet) => pet.nome.toLowerCase().includes(termo)),
    );
  });

  public aoDigitar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }

  // ==========================================
  // NAVEGAÇÃO INTERNA
  // ==========================================
  public abrirPetsDoTutor(tutor: Tutor): void {
    this.tutorSelecionado.set(tutor);
    this.termoBusca.set(''); // Limpa a busca ao entrar
    this.telaAtual.set('lista_pets');
  }

  public voltarParaTutores(): void {
    this.tutorSelecionado.set(null);
    this.telaAtual.set('lista_tutores');
  }

  // ==========================================
  // AÇÕES
  // ==========================================
  public iniciarAtendimento(pet: any): void {
    console.log('Navegando para prontuários... Paciente:', pet.nome);
    this.router.navigate(['/clinica/prontuarios']);
  }

  public verHistorico(pet: any): void {
    alert(`Preparando o histórico médico do paciente: ${pet.nome} 🐾`);
  }
}
