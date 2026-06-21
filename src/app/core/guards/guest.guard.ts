import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const autenticado = await auth.ensureAuthenticated();
  return autenticado ? router.createUrlTree(['/hub']) : true;
};
