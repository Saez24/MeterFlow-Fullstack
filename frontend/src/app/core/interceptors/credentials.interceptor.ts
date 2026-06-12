import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, from, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<boolean>(false);

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthEndpoint = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout']
        .some(path => req.url.includes(path));

      if (err.status !== 401 || isAuthEndpoint) {
        return throwError(() => err);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return refreshDone$.pipe(
          filter(done => done),
          take(1),
          switchMap(() => next(authReq)),
        );
      }

      isRefreshing = true;
      refreshDone$.next(false);

      return from(
        fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      ).pipe(
        switchMap(res => {
          isRefreshing = false;
          if (res.ok) {
            refreshDone$.next(true);
            return next(authReq);
          }
          refreshDone$.next(true);
          router.navigate(['/auth']);
          return throwError(() => err);
        }),
        catchError(() => {
          isRefreshing = false;
          refreshDone$.next(true);
          router.navigate(['/auth']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
