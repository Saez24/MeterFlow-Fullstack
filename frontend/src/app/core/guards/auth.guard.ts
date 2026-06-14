import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = async () => {
  const api = inject(ApiService);
  const router = inject(Router);
  await api.sessionReady;
  return api.currentUser() !== null ? true : router.createUrlTree(['/auth']);
};
