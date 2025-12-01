import { Component, OnInit } from '@angular/core';
import { Diagrams } from '../../../Models/Diagrams/diagrams.model';
import { DiagramsService } from '../../../Services/diagrams.service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../Services/Auth/auth-services.service';

@Component({
  selector: 'app-diagramslist',
  imports: [HttpClientModule , CommonModule , FormsModule],
  templateUrl: './diagramslist.component.html',
  styleUrl: './diagramslist.component.scss',
  providers: [DiagramsService, AuthService]
})
export class DiagramslistComponent implements OnInit {

  diagramsList: Diagrams[] = [];
  diagramID: number| null = null;
  user: any = {};
  constructor(private DiagramsServices : DiagramsService , private router: Router , private authServices : AuthService) {}

  ngOnInit(): void {
    this.fetchList();
    this.authServices.getUser().subscribe((res) => {
      this.user = res;
    });
  }

  fetchList(){
    this.DiagramsServices.displayDiagrams().subscribe((data) => {
      this.diagramsList = data;
    })
  }

  viewDiagrams(id: number){
    if (id) {
      this.diagramID = id;
      this.router.navigate(['/home', 'displayDiagram', this.diagramID]);
    }
  }
  newDiagram(){
    this.router.navigate(['/home', 'createDiagram']);
  }

}
