import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const guestGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService).client;
  const router = inject(Router);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    router.navigate(['/hub']);
    return false;
  }

  return true;
};
