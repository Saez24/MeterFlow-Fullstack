import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

let isRefreshing = false;

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/') && !isRefreshing) {
        isRefreshing = true;
        return from(
          fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
        ).pipe(
          switchMap(res => {
            isRefreshing = false;
            if (res.ok) return next(authReq);
            router.navigate(['/auth']);
            return throwError(() => err);
          }),
          catchError(() => {
            isRefreshing = false;
            router.navigate(['/auth']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
