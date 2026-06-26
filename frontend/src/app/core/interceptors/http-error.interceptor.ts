/**
 * HTTP Error Interceptor
 * Global error handling for HTTP requests
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = error.error?.message || 
                      `Server Error: ${error.status} - ${error.statusText}`;
      }

      console.error('HTTP Error:', errorMessage, error);
      return throwError(() => error);
    })
  );
};
