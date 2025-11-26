import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../Services/Auth/auth-services.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService) as AuthService;
  const token = auth.token(); // signal or stored value

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
