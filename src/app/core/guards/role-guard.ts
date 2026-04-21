import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const role = inject(Auth).getUserRoleValue();

  const papeisPermitidos = route.data['roles'] as Array<string>;

  if (!papeisPermitidos || papeisPermitidos.length === 0) {
    return true;
  }

  if (role && papeisPermitidos.includes(role)) {
    return true;
  }

  console.warn('Bloqueado pelo RoleGuard: Acesso não autorizado.');

  return router.createUrlTree(['/clinica/dashboard']);
};
