import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userName = localStorage.getItem('user_name');

  if (userName) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};