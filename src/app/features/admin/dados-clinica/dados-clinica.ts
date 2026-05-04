import {
  Component,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Clinica } from '../../../core/models/clinica.model';
import { ClinicaService } from '../../../core/services/clinica.service';

@Component({
  selector: 'app-dados-clinica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './dados-clinica.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DadosClinicaComponent implements OnInit {
  editMode = signal(false);
  loading = signal(false);

  clinicaService = inject(ClinicaService);

  clinicaData = signal<Clinica>({} as Clinica);

  clinicaDataMock = signal({
    razao_social: 'My Pet Health Serviços Vet Ltda',
    nome_fantasia: 'Clínica Veterinária Central',
    cnpj: '12.345.678/0001-99',
    email_contato: 'contato@mypethealth.com',
    telefone_contato: '(11) 99999-8888',
    cep: '01001-000',
    logradouro: 'Rua das Patas',
    numero: '123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
  });

  clinicaForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {
    this.clinicaData.set(this.clinicaService.clinica() || this.clinicaDataMock());
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
      bairro: [data.bairro, [Validators.required]],
      cidade: [data.cidade, [Validators.required]],
      uf: [data.uf, [Validators.required, Validators.maxLength(2)]],
    });
  }

  toggleEdit() {
    this.editMode.update((v) => !v);
    if (!this.editMode()) {
      this.clinicaForm.patchValue(this.clinicaData());
    }
    this.cdr.markForCheck();
  }

  async salvarAlteracoes() {
    if (this.clinicaForm.valid) {
      this.zone.run(() => {
        this.loading.set(true);
        this.cdr.detectChanges();
      });

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const novosDados = this.clinicaForm.value;

        this.zone.run(() => {
          this.clinicaData.set(novosDados);
          this.editMode.set(false);
          this.loading.set(false);

          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      } catch (error) {
        console.error('Erro ao salvar:', error);
        this.zone.run(() => {
          this.loading.set(false);
          this.cdr.detectChanges();
        });
      }
    }
  }
}
