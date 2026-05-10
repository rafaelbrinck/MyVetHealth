# 🐾 MyVetHealth: O Futuro da Gestão Veterinária

Bem-vindo ao repositório oficial do MyVetHealth (também conhecido como My Pet Health). O MyVetHealth é um sistema de gestão (SaaS) completo e Multi-tenant focado exclusivamente em Clínicas Veterinárias. Projetado desde o primeiro dia com uma arquitetura moderna, nossas respostas de design e engenharia focam em alta performance, Clean Code, segurança robusta e uma excelente UX (User Experience). Nós entendemos que, em um ambiente clínico, agilidade e confiabilidade salvam vidas. Por isso, abandonamos o peso dos ERPs legados e construímos uma plataforma ultrarrápida, escalável e incrivelmente intuitiva.

---

## 🚀 O Diferencial Arquitetural

Não somos apenas "codificadores"; nós construímos o MyVetHealth com a visão de verdadeiros "engenheiros de produto". Nossa plataforma unifica o atendimento médico e a gestão de clientes em um ecossistema coeso, utilizando padrões de desenvolvimento de nível Sênior:

- **Camada Anticorrupção (Frontend):** Todos os Services do Angular que se comunicam com o banco de dados mapeiam os retornos sujos (Nested JSON) para Interfaces limpas antes de atualizar o estado visual.
- **Cache Inteligente e Reatividade:** Utilizamos Signals para guardar dados em memória (como o TutorService e ClinicaService), evitando requisições redundantes e garantindo carregamentos instantâneos ao trocar de telas.
- **Segurança de Nível Hospitalar (RBAC & RLS):** O sistema é multi-tenant e possui papéis definidos (`admin_clinica`, `veterinario`, `recepcionista`). O acesso é blindado no Front-end por Guards funcionais e no Back-end pelo Row Level Security (RLS) "Secure by Default" do Supabase.
- **Proteção Anti-Race Condition:** Utilizamos estratégias de espera inteligente e `Promise.all` para queries paralelas, garantindo integridade e sincronia em operações complexas.

---

## 🛠️ Stack Tecnológica de Ponta

Nossa escolha de tecnologias foi cirúrgica para bater de frente com sistemas líderes de mercado:

### Front-end

- **Framework:** Angular 17+.
- **Estrutura:** Standalone Components e o novo Control Flow (`@if`, `@for`).
- **Gerência de Estado:** Reatividade pura utilizando Angular Signals para uma UI sem engasgos.
- **UI/UX & Estilização:** Tailwind CSS.
  - Design limpo com foco no conceito de Mobile First.
  - Paleta de cores sofisticada utilizando tons de branco, neutros, nosso "Teal" da marca (`#0da193`) e emerald.
  - **Ícones:** Lucide-Angular, garantindo identidade visual profissional, traços consistentes e alta performance através de Tree-Shaking nativo.
  - **Dark Mode:** Suporte nativo e persistente gerenciado via Signals e estratégia de classes do Tailwind.

### Back-end & Infraestrutura

- **BaaS Principal:** Supabase.
- **Banco de Dados:** PostgreSQL com arquitetura relacional profunda (Tabelas essenciais como `perfis`, `clinicas`, `equipe_clinica`, `pets`, e `consultas`).
- **Serverless:** Supabase Edge Functions (Deno/TypeScript) perfeitas para construir lógicas isoladas, integrações e fluxos privilegiados (como o Cadastro Expresso de tutores).
- **Transações Atômicas:** Database Functions (RPCs) com `SECURITY DEFINER` para fluxos complexos como gestão de convites de equipe.

---

## 💡 Principais Módulos e Funcionalidades

- **Agenda Inteligente Profissional:** Integração com o Angular Calendar para uma visão completa de agendamentos. Consultas mapeadas nativamente com queries otimizadas (`.gte` e `.lte`) para buscar apenas eventos do período visível, poupando processamento.
- **Prontuário e Pacientes (Master-Detail):** Interface de alta performance para listar tutores. Ao interagir, a tela exibe os cards da família e permite adicionar novos pets instantaneamente com atualização otimista (UI reativa sem necessidade de recarregar a página).
- **Onboarding & Gestão de Equipe:** Fluxo contínuo misturando membros ativos e convites pendentes, garantindo ao Admin controle total sobre o acesso dos colaboradores.
- **Cadastro Expresso:** Funcionalidade ágil na Recepção permitindo criação de perfis de Tutores e vinculação automática à clínica via Edge Functions.
- **Configurações e UI Dinâmica:** Menu lateral e dropdowns que reagem ao cargo logado, ocultando opções não permitidas utilizando `podeAcessar()`.

---

## 👨‍💻 Como iniciar o projeto

1. Clone o repositório.
2. Certifique-se de estar rodando uma versão recente do Node.js.
3. Instale as dependências executando: `npm install`.
4. Configure suas variáveis de ambiente do Supabase no arquivo de environment do Angular.
5. Inicie o servidor de desenvolvimento: `ng serve`.
6. Acesse a aplicação no seu navegador localmente.

> _"Analisar o mercado é o que nos diferencia de sermos apenas codificadores para nos tornarmos verdadeiros engenheiros de produto."_
> — Equipe MyVetHealth
