import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vacinas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vacinas.html',
  styleUrl: './vacinas.css'
})
export class VacinasComponent {
  
  public listaVacinas = signal([
    { id: 1, pet: 'Max', tutor: 'João da Silva', vacina: 'V10', dataAplicacao: '10/04/2025', proximaDose: '10/04/2026', status: 'Atrasada' },
    { id: 2, pet: 'Thor', tutor: 'Pedro', vacina: 'Gripe Canina', dataAplicacao: '15/10/2025', proximaDose: '15/04/2026', status: 'Vence em breve' },
    { id: 3, pet: 'Luna', tutor: 'Mariana', vacina: 'Raiva', dataAplicacao: '05/04/2026', proximaDose: '05/04/2027', status: 'Em dia' },
    { id: 4, pet: 'Mia', tutor: 'Ana Clara', vacina: 'V4 Felina', dataAplicacao: '12/03/2026', proximaDose: '12/03/2027', status: 'Em dia' },
    { id: 5, pet: 'Bolinha', tutor: 'Carlos Eduardo', vacina: 'Giárdia', dataAplicacao: '05/01/2025', proximaDose: '05/01/2026', status: 'Atrasada' }
  ]);

  public termoBusca = signal('');
  
  // 🔥 NOVO: Signal para guardar o status selecionado no dropdown
  public filtroStatus = signal('Todos');
  
  public isModalOpen = signal(false);

  // 🔥 ATUALIZADO: Agora filtra por texto E por status simultaneamente
  public vacinasFiltradas = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    const status = this.filtroStatus();

    return this.listaVacinas().filter(v => {
      // Regra 1: Passa se o texto bater com pet, vacina ou tutor (ou se não tiver texto)
      const passaTexto = !termo || 
        v.pet.toLowerCase().includes(termo) ||
        v.vacina.toLowerCase().includes(termo) ||
        v.tutor.toLowerCase().includes(termo);

      // Regra 2: Passa se o status for igual ao selecionado (ou se for 'Todos')
      const passaStatus = status === 'Todos' || v.status === status;

      // Só aparece na tela se passar nas duas regras
      return passaTexto && passaStatus;
    });
  });

  public aoDigitar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }

  // 🔥 NOVO: Função que captura a mudança no <select>
  public aoMudarStatus(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroStatus.set(select.value);
  }

  // ==========================================
  // CONTROLES DO MODAL E AÇÕES
  // ==========================================

  public abrirModal(): void {
    this.isModalOpen.set(true);
  }

  public fecharModal(): void {
    this.isModalOpen.set(false);
  }

  public salvarVacina(pet: string, vacina: string, dataAplicacao: string, proximaDose: string): void {
    if (!pet.trim() || !vacina.trim()) {
      alert('Preencha o nome do Pet e da Vacina!');
      return;
    }

    const novaVacina = {
      id: Math.random(),
      pet: pet,
      tutor: 'Tutor a definir',
      vacina: vacina,
      dataAplicacao: dataAplicacao,
      proximaDose: proximaDose,
      status: 'Em dia' 
    };

    this.listaVacinas.update(lista => [novaVacina, ...lista]);
    this.fecharModal();
  }

  public notificarTutor(tutor: string): void {
    alert(`Notificação de lembrete de vacina enviada para o WhatsApp/App de: ${tutor} 📲`);
  }
}