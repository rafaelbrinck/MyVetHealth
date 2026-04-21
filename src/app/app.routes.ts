import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  // ==========================================
  // 1. ROTAS PÚBLICAS (Auth Layout)
  // ==========================================
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
        canActivate: [guestGuard],
      },
      {
        path: 'hub',
        loadComponent: () =>
          import('./features/auth/workspace-clinicas/workspace-clinicas').then(
            (m) => m.WorkspaceClinicas,
          ),
        canActivate: [authGuard],
      },
      // Redireciona a raiz para o login
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ==========================================
  // 2. ROTAS DO TUTOR (B2C - Layout Mobile-First)
  // ==========================================
  {
    path: 'tutor',
    loadComponent: () =>
      import('./features/tutor/layout/tutor-layout.component').then((m) => m.TutorLayoutComponent),
    // canActivate: [authGuard],
    data: { roles: ['tutor'] }, // O Guard usará isso para validar o acesso
    children: [
      //   {
      //     path: 'meus-pets',
      //     loadComponent: () =>
      //       import('./features/tutor/pets/meus-pets.component').then((m) => m.MeusPetsComponent),
      //   },
      { path: '', redirectTo: 'meus-pets', pathMatch: 'full' },
    ],
  },

  // ==========================================
  // 3. ROTAS DA CLÍNICA (B2B - Layout Admin)
  // ==========================================
  {
    path: 'clinica',
    loadComponent: () =>
      import('./features/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin_clinica', 'veterinario', 'recepcionista'] },
    children: [
      // {
      //   path: 'dashboard',
      //   loadComponent: () =>
      //     import('./features/admin/dashboard/dashboard.component').then(
      //       (m) => m.DashboardComponent,
      //     ),
      // },
      {
        path: 'recepcao',
        loadComponent: () =>
          import('./features/admin/reception/reception').then((m) => m.ReceptionComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin_clinica', 'recepcionista'] },
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'prontuarios',
        loadComponent: () =>
          import('./features/admin/prontuario/prontuario').then((m) => m.ProntuarioComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin_clinica', 'veterinario'] },
      },
      {
        path: 'pacientes',
        loadComponent: () =>
          import('./features/admin/pacientes/pacientes').then((m) => m.PacientesComponent),
      },
      {
        path: 'vacinas',
        loadComponent: () =>
          import('./features/admin/vacinas/vacinas').then((m) => m.VacinasComponent),
      },
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: ['admin_clinica'] }, // 👑 Apenas Admin acessa o agrupador
        children: [
          // {
          //   path: 'clinic',
          //   loadComponent: () => import('./features/admin/settings/clinic-data').then(m => m.ClinicDataComponent)
          // },
          {
            path: 'equipe',
            loadComponent: () =>
              import('./features/admin/equipe/equipe').then((m) => m.EquipeComponent),
          },
          { path: '', redirectTo: 'clinic', pathMatch: 'full' },
        ],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ==========================================
  // 4. ROTA DE ERRO / ACESSO NEGADO
  // ==========================================
  {
    path: 'error-page',
    loadComponent: () =>
      import('./shared/components/error-page/error-page.component').then(
        (m) => m.ErrorPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
