import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Useraccount } from '../../Models/Useraccount/useraccount.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/user`;

  constructor(private http : HttpClient) { }

  displayUser(): Observable<Useraccount[]>{
    return this.http.get<Useraccount[]>(`${this.apiUrl}/display`);
  }
}
