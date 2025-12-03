import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, from, Observable, of, tap } from 'rxjs';
import { User } from '../../Models/User/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://park.renaissance.ph/api';
  private apiUrl1 = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}
  token = signal<string | null>(null);
  login(credentials: { username: string; password: string }) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.token.set(res.access_token))
    );
  }

  logout() {
    const authToken = this.token();

    if (!authToken) {
      this.token.set(null);
      localStorage.removeItem('token');
      return of(true);
    }

    return this.http.post(
      `${this.apiUrl}/logout`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    ).pipe(
      tap(() => {
        this.token.set(null);
        localStorage.removeItem('token');
      }),
      catchError(err => {
        // Still clear token even if logout fails
        this.token.set(null);
        localStorage.removeItem('token');
        return of(err);
      })
    );
  }

  displayuserList(): Observable<User[]>{
    return this.http.get<User[]>(`${this.apiUrl}/userAccount`);
  }

  googleLogin(token: string) {
    return this.http.post(`${this.apiUrl1}/google-login`, { token });
  }

  me() {
    return this.http.get(`${this.apiUrl}/me`);
  }

  getUser() {
    const token = localStorage.getItem('token');

    return this.http.get(`${this.apiUrl1}/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  isAuthenticated() {
    return !!this.token();
  }
}
