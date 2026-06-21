import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { PapelEquipe } from '../models/clinica.model';

const PAPEIS_CLINICA: PapelEquipe[] = ['admin_clinica', 'veterinario', 'recepcionista'];

export const roleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const autenticado = await auth.ensureAuthenticated();
  if (!autenticado) {
    return router.createUrlTree(['/login']);
  }

  const papeisPermitidos = route.data['roles'] as PapelEquipe[] | undefined;
  if (!papeisPermitidos?.length) {
    return true;
  }

  const papel = await auth.ensureRoleForActiveClinic();

  if (papel && papeisPermitidos.includes(papel as PapelEquipe)) {
    return true;
  }

  if (papel && PAPEIS_CLINICA.includes(papel as PapelEquipe)) {
    return router.createUrlTree(['/clinica/dashboard']);
  }

  if (papel === 'tutor') {
    return router.createUrlTree(['/tutor/dashboard']);
  }

  return router.createUrlTree(['/hub']);
};
