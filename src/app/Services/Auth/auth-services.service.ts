import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = 'https://park.renaissance.ph/api';

  constructor(private http: HttpClient) {}

  // safest → avoids XSS exposure
  token = signal<string | null>(null);

  login(credentials: { username: string; password: string }) {
    return this.http.post<any>(`${this.api}/login`, credentials).pipe(
      tap(res => this.token.set(res.access_token))
    );
  }

  logout() {
    this.token.set(null);
    return this.http.post(`${this.api}/logout`, {}, {
      headers: { Authorization: `Bearer ${this.token()}` }
    });
  }

  me() {
    return this.http.get(`${this.api}/me`);
  }

  isAuthenticated() {
    return !!this.token();
  }
}
