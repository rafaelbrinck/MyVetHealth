import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-dados-clinica',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './dados-clinica.html',
})
export class DadosClinicaComponent implements OnInit {
  editMode = signal(false);
  loading = signal(false);

  // Mapeamento idêntico ao HTML e ao banco
  clinicaData = signal({
    razao_social: 'My Pet Health Serviços Vet Ltda',
    nome_fantasia: 'Clínica Veterinária Central',
    cnpj: '12.345.678/0001-99',
    email_contato: 'contato@mypethealth.com',
    telefone_contato: '(11) 99999-8888',
    cep: '01000-000',
    logradouro: 'Rua das Patas',
    numero: '123',
    complemento: 'Sala 01',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
  });

  clinicaForm!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  ngOnInit() {}

  initForm() {
    const data = this.clinicaData();
    this.clinicaForm = this.fb.group({
      razao_social: [data.razao_social, [Validators.required]],
      nome_fantasia: [data.nome_fantasia, [Validators.required]],
      cnpj: [data.cnpj, [Validators.required]],
      email_contato: [data.email_contato, [Validators.required, Validators.email]],
      telefone_contato: [data.telefone_contato, [Validators.required]],
      cep: [data.cep, [Validators.required]],
      logradouro: [data.logradouro, [Validators.required]],
      numero: [data.numero, [Validators.required]],
      complemento: [data.complemento],
      bairro: [data.bairro, [Validators.required]],
      cidade: [data.cidade, [Validators.required]],
      uf: [data.uf, [Validators.required, Validators.maxLength(2)]],
    });
  }

  toggleEdit() {
    if (this.editMode()) {
      this.clinicaForm.patchValue(this.clinicaData());
    }
    this.editMode.set(!this.editMode());
  }

  salvarAlteracoes() {
    if (this.clinicaForm.valid) {
      this.loading.set(true);
      // Aqui simula a atualização. No futuro usaremos o SupabaseService
      setTimeout(() => {
        this.clinicaData.set(this.clinicaForm.value);
        this.editMode.set(false);
        this.loading.set(false);
      }, 800);
    }
  }
}
