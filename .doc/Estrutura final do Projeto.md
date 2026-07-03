# 🐾 MyVetHealth

> Plataforma SaaS B2B2C Multi-Tenant para gerenciamento clínico
> veterinário e prontuário digital veterinário.

## Sobre

O **MyVetHealth** é uma plataforma desenvolvida para integrar clínicas
veterinárias e tutores em um único ecossistema digital, eliminando a
fragmentação dos dados clínicos e oferecendo acesso seguro ao histórico
médico dos animais.

### Instituição

-   **Centro Universitário Senac-RS**
-   Curso: Análise e Desenvolvimento de Sistemas
-   Disciplina: Projeto de Desenvolvimento II
-   Professor: Luciano Zanuz

### Equipe

-   **Pedro Brum** --- Frontend e UI/UX
-   **Rafael Brinckmann** --- Backend, Banco de Dados e DevOps

------------------------------------------------------------------------

# Resumo

O gerenciamento de dados veterinários ainda é altamente fragmentado.
Informações importantes permanecem armazenadas apenas na clínica onde o
atendimento foi realizado, dificultando consultas futuras e atendimentos
de emergência.

O MyVetHealth resolve esse problema através de uma plataforma SaaS B2B2C
Multi-Tenant composta por:

-   ERP para clínicas;
-   Prontuário Eletrônico do Paciente (PEP);
-   Web App para tutores;
-   Compartilhamento seguro de informações clínicas.

Entre seus diferenciais estão:

-   Sincronização automática entre clínica e tutor;
-   Laudos médicos imutáveis;
-   Tokens temporários para acesso emergencial;
-   Histórico clínico centralizado;
-   Segurança baseada em PostgreSQL + Row Level Security (RLS).

# Problema

Os principais problemas identificados foram:

1.  Fragmentação das informações clínicas.
2.  Dependência de processos manuais no pós-consulta.
3.  Falta de acesso ao histórico durante emergências.

# Objetivo Geral

Desenvolver uma plataforma ecossistêmica Multi-Tenant capaz de unificar
o gerenciamento clínico veterinário com um prontuário digital seguro e
acessível aos tutores.

# Objetivos Específicos

-   Modelar banco de dados PostgreSQL no Supabase.
-   Desenvolver frontend em Angular Standalone com Signals.
-   Automatizar regras de negócio utilizando Triggers e PL/pgSQL.
-   Implementar interface responsiva utilizando Tailwind CSS v4.
-   Garantir imutabilidade dos laudos médicos.
-   Implementar compartilhamento seguro por tokens temporários.

# Stack Tecnológica

  Tecnologia        Utilização
  ----------------- ----------------------
  Angular 17+       Frontend
  TypeScript        Linguagem principal
  Tailwind CSS v4   Interface
  Supabase          Backend as a Service
  PostgreSQL        Banco de Dados
  PL/pgSQL          Automação
  Vercel            Deploy

# Arquitetura

O sistema foi desenvolvido utilizando arquitetura SaaS B2B2C
Multi-Tenant, separando completamente os dados de cada clínica através
de políticas RLS.

O frontend comunica-se diretamente com o Supabase, responsável por
autenticação, banco de dados e execução das regras de negócio.

# Funcionalidades

-   Cadastro de clínicas
-   Cadastro de tutores
-   Cadastro de pets
-   Prontuário eletrônico
-   Histórico médico
-   Evolução de peso
-   Receitas
-   Laudos médicos
-   Impressão em PDF
-   Dashboard responsivo
-   Dark Mode
-   Compartilhamento por Token

# Triggers

## Atualização automática do peso

``` sql
CREATE TRIGGER trigger_atualizar_peso_pet
AFTER INSERT OR UPDATE OF peso_momento
ON consultas;
```

Atualiza automaticamente o peso atual do animal após cada consulta.

## Vinculação Tutor x Clínica

``` sql
CREATE TRIGGER trigger_vincular_tutor_clinica
AFTER INSERT
ON consultas;
```

Cria automaticamente o relacionamento entre clínica e tutor.

## Sincronização Auth

``` sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT
ON auth.users;
```

Replica automaticamente usuários autenticados para a tabela pública de
perfis.

# Validação

Foram realizados testes de usabilidade utilizando a escala SUS com 15
usuários.

Resultado médio:

**84,5 pontos (Excellent)**

Também foram executados testes de carga simulando 1.000 consultas
simultâneas em aproximadamente 10 segundos.

Resultado:

-   média de 42 ms por transação;
-   sem deadlocks;
-   sem perda de integridade referencial.

# Conclusão

O projeto atingiu os objetivos propostos ao desenvolver uma plataforma
moderna, segura e escalável para clínicas veterinárias e tutores.

O uso de Angular, Supabase, PostgreSQL, Triggers e Row Level Security
permitiu construir uma solução robusta, alinhada às necessidades do
mercado veterinário.

## Melhorias Futuras

-   Leitura de QR Code para identificação dos pacientes;
-   Notificações automáticas de vacinação;
-   Integração com serviços de mensageria;
-   Evolução dos gráficos biométricos.

# Referências

-   Angular Documentation
-   PostgreSQL Documentation
-   Supabase Documentation
-   Tailwind CSS Documentation
-   Wazlawick --- Engenharia de Software
-   Wazlawick --- Metodologia de Pesquisa
