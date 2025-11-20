import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Diagrams } from '../Models/Diagrams/diagrams.model';

@Injectable({
  providedIn: 'root'
})
export class DiagramsService {
  private apiUrl = `${environment.apiUrl}/diagrams`;

  constructor(private http : HttpClient) { }

  displayDiagrams(): Observable<Diagrams[]>{
    return this.http.get<Diagrams[]>(`${this.apiUrl}/display`);
  }
  displayDiagramsbyID(id : number): Observable<Diagrams>{
    return this.http.get<Diagrams>(`${this.apiUrl}/display/${id}`);
  }
  storeDiagrams(post: Diagrams): Observable<Diagrams>{
    return this.http.post<Diagrams>(`${this.apiUrl}/store`, post);
  }
  updateDiagrams(post: Diagrams , id: number): Observable<Diagrams>{
    return this.http.put<Diagrams>(`${this.apiUrl}/update/${id}`, post);
  }
}
