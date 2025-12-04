import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Shared } from '../../Models/SharedDiagram/shared.model';

@Injectable({
  providedIn: 'root'
})
export class SharedaccessService {

  private apiUrl = `${environment.apiUrl}/share`;

  constructor(private http : HttpClient) { }

  storeSharedAccess(post : Shared): Observable<Shared>{
    return this.http.post<Shared>(`${this.apiUrl}/store` , post);
  }
}
