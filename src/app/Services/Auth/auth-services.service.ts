import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, tap } from 'rxjs';
import { User } from '../../Models/User/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://park.renaissance.ph/api';

  constructor(private http: HttpClient) {}
  token = signal<string | null>(null);
  login(credentials: { username: string; password: string }) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.token.set(res.access_token))
    );
  }

  logout() {
    this.token.set(null);
    return this.http.post(`${this.apiUrl}/logout`, {}, {
      headers: { Authorization: `Bearer ${this.token()}` }
    });
  }
  displayuserList(): Observable<User[]>{
    return this.http.get<User[]>(`${this.apiUrl}/userAccount`);
  }

  me() {
    return this.http.get(`${this.apiUrl}/me`);
  }

  isAuthenticated() {
    return !!this.token();
  }
}
