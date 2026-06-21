import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const autenticado = await auth.ensureAuthenticated();
  return autenticado ? true : router.createUrlTree(['/login']);
};
