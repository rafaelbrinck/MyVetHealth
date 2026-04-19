import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; 
import { Auth } from '../../../core/services/auth';
import { TutorService } from '../../../core/services/tutor.service';
import { Tutor } from '../../../core/models/tutor.model';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reception.html',
  styleUrl: './reception.css',
})
export class ReceptionComponent implements OnInit {
  
  // ==========================================
  // INJEÇÕES DE DEPENDÊNCIA
  // ==========================================
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  public tutorService = inject(TutorService); // Público para acessar o signal 'tutores' no HTML se necessário

  // ==========================================
  // ESTADOS DA TELA
  // ==========================================
  public telaAtual = signal<'busca' | 'perfil_tutor' | 'novo_cadastro'>('busca');
  public statusBusca = signal<'ocioso' | 'buscando' | 'nao_encontrado'>('ocioso');
  public isSubmitting = signal(false);

  // ==========================================
  // DADOS DO TUTOR SELECIONADO
  // ==========================================
  public tutorAtivo = signal<Tutor | null>(null);
  public petsTutor = signal<any[]>([]);

  // ==========================================
  // FORMULÁRIO REATIVO
  // ==========================================
  public cadastroForm: FormGroup;

  constructor() {
    this.cadastroForm = this.fb.group({
      nomeTutor: ['', [Validators.required, Validators.minLength(3)]],
      cpf: ['', [Validators.required, Validators.minLength(11)]],
      email: ['', [Validators.required, Validators.email]],
      nomePet: ['', Validators.required],
      especie: ['', Validators.required],
      raca: [''],
      cor: [''],
      dataNascimento: ['']
    });
  }

  // Carrega os dados da clínica ao iniciar o componente
  async ngOnInit() {
    try {
      await this.tutorService.getTutoresComPets();
    } catch (error) {
      console.error('Erro ao inicializar recepção:', error);
    }
  }

  // ==========================================
  // FLUXO DE BUSCA (REAL)
  // ==========================================
  public buscarTutor(termo: string): void {
    if (!termo.trim()) return;
    this.statusBusca.set('buscando');

    // Pequeno delay apenas para feedback visual (UX)
    setTimeout(() => {
      const busca = termo.toLowerCase().trim();
      
      // Busca no signal global de tutores que já está carregado
      const encontrado = this.tutorService.tutores().find(t => 
        t.cpf.replace(/\D/g, '').includes(busca.replace(/\D/g, '')) || 
        t.nome.toLowerCase().includes(busca) ||
        t.email.toLowerCase().includes(busca)
      );

      if (encontrado) {
        this.tutorAtivo.set(encontrado);
        this.petsTutor.set(encontrado.pets || []);
        this.statusBusca.set('ocioso');
        this.telaAtual.set('perfil_tutor');
      } else {
        this.statusBusca.set('nao_encontrado');
      }
    }, 600);
  }

  public iniciarConsulta(pet: any): void {
    // Integração futura com ConsultaService
    alert(`✅ Consulta aberta para ${pet.nome}! O paciente foi enviado para a fila.`);
    this.voltarParaBusca();
  }

  // ==========================================
  // NAVEGAÇÃO E CADASTRO
  // ==========================================
  public irParaNovoCadastro(): void {
    this.cadastroForm.reset(); 
    this.telaAtual.set('novo_cadastro');
  }

  public voltarParaBusca(): void {
    this.telaAtual.set('busca');
    this.statusBusca.set('ocioso');
    this.tutorAtivo.set(null);
    this.petsTutor.set([]);
  }

  public async salvarCadastro() {
    if (this.cadastroForm.invalid) {
      this.cadastroForm.markAllAsTouched(); 
      return;
    }

    this.isSubmitting.set(true);

    try {
      const valores = this.cadastroForm.value;
      
      // Envia para a Edge Function via AuthService
      await this.authService.criarCadastroExpresso(valores);

      // AQUI VOCÊ FORÇA A ATUALIZAÇÃO! 
      // Passamos 'true' para ele ignorar o cache e buscar o cliente que acabou de ser criado.
      await this.tutorService.getTutoresComPets(true);

      alert('🎉 Cadastro e ficha do pet criados com sucesso!');
      this.voltarParaBusca();
    } catch (error: any) {
      console.error('Erro no cadastro expresso:', error);
      alert('Erro: ' + (error.message || 'Falha ao processar cadastro'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}