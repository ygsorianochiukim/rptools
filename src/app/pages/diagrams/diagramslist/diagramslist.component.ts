import { Component, OnInit } from '@angular/core';
import { Diagrams } from '../../../Models/Diagrams/diagrams.model';
import { DiagramsService } from '../../../Services/diagrams.service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-diagramslist',
  imports: [HttpClientModule , CommonModule , FormsModule],
  templateUrl: './diagramslist.component.html',
  styleUrl: './diagramslist.component.scss',
  providers: [DiagramsService]
})
export class DiagramslistComponent implements OnInit {

  diagramsList: Diagrams[] = [];
  diagramID: number| null = null;

  constructor(private DiagramsServices : DiagramsService , private router: Router) {}

  ngOnInit(): void {
    this.fetchList();
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
