import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClinicaService } from '../../../core/services/clinica.service';

@Component({
  selector: 'app-equipe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './equipe.html',
  styleUrl: './equipe.css',
})
export class EquipeComponent implements OnInit {
  private fb = inject(FormBuilder);
  public clinicaService = inject(ClinicaService);

  // 1. ATUALIZE A TIPAGEM DO SINAL
  public telaAtual = signal<'lista' | 'cadastro' | 'convite_gerado'>('lista'); // <--- NOVO ESTADO AQUI

  // 2. ADICIONE ESSA VARIÁVEL PARA GUARDAR O LINK
  public linkConviteGerado = signal<string>('');
  public isSubmitting = signal(false);

  public cadastroForm: FormGroup;

  constructor() {
    this.cadastroForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      cpf: ['', [Validators.required, Validators.minLength(11)]],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', Validators.required],
      papel: ['veterinario', Validators.required],
      crmv: [''], // CRMV é opcional porque recepcionista não tem
    });
  }

  async ngOnInit() {
    try {
      await this.clinicaService.carregarMembrosEquipe();
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
    }
  }

  public abrirFormulario(): void {
    this.cadastroForm.reset({ papel: 'veterinario' }); // Reseta o form com valor padrão
    this.telaAtual.set('cadastro');
  }

  public voltarParaLista(): void {
    this.telaAtual.set('lista');
  }

  public async salvarMembro() {
    if (this.cadastroForm.invalid) {
      this.cadastroForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const valores = this.cadastroForm.value;
      const resposta = await this.clinicaService.cadastrarMembroEquipe(valores);

      // Avalia a resposta da Edge Function para saber o que mostrar pro usuário
      if (resposta.acao === 'convite_gerado') {
        // Monta o link completo com o token
        const link = `${resposta.token}`;
        this.linkConviteGerado.set(link);

        // Troca para a nova tela de sucesso
        this.telaAtual.set('convite_gerado');
      } else {
        alert(`${resposta.mensagem}\n\nO acesso é o e-mail cadastrado e a senha padrão é o CPF.`);
        this.voltarParaLista();
      }

      // Recarrega a lista do banco para o novo membro aparecer na tabela
      await this.clinicaService.carregarMembrosEquipe(true); // Força recarga ignorando cache
    } catch (error: any) {
      console.error('Erro ao cadastrar membro:', error);
      alert('Erro: ' + (error.message || 'Falha ao processar o cadastro.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  public copiarLink() {
    navigator.clipboard.writeText(this.linkConviteGerado());
    alert('✅ Link copiado para a área de transferência!');
  }
}
