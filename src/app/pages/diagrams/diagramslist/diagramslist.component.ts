import { Component, OnInit } from '@angular/core';
import { Diagrams } from '../../../Models/Diagrams/diagrams.model';
import { DiagramsService } from '../../../Services/diagrams.service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../Services/Auth/auth-services.service';
import { LucideAngularModule, CircleX } from 'lucide-angular';
import { UserService } from '../../../Services/User/user.service';
import { User } from '../../../Models/User/user.model';
import { Useraccount } from '../../../Models/Useraccount/useraccount.model';
import { SharedaccessService } from '../../../Services/SharedDiagram/sharedaccess.service';
import { Shared } from '../../../Models/SharedDiagram/shared.model';

@Component({
  selector: 'app-diagramslist',
  imports: [HttpClientModule, CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './diagramslist.component.html',
  styleUrl: './diagramslist.component.scss',
  providers: [DiagramsService, AuthService, UserService , SharedaccessService],
})
export class DiagramslistComponent implements OnInit {
  readonly CloseIcon = CircleX;
  ownedDiagrams: Diagrams[] = [];
  sharedDiagrams: Diagrams[] = [];
  diagramID: number | null = null;
  user: any = {};
  shareModal = false;
  shareOption = false;
  UserList: Useraccount[] = [];
  selectedUserIds: number[] = [];
  DiagramsInfo: Diagrams = {
    is_shareable: null,
  }
  sharedAccessField: Shared = {
    diagram_id: null,
    user_id: null,
    created_by: null,
  }
  constructor(
    private DiagramsServices: DiagramsService,
    private router: Router,
    private authServices: AuthService,
    private userServices: UserService,
    private SharedServices : SharedaccessService
  ) {}

  ngOnInit(): void {
    this.fetchUserList();
    this.authServices.getUser().subscribe((res) => {
      this.user = res;

      this.DiagramsServices.getUserDiagrams(this.user.id).subscribe(res => {
        this.ownedDiagrams = res.owned;
        this.sharedDiagrams = res.shared;
      });
    });
  }
  fetchUserList() {
    this.userServices.displayUser().subscribe((data) => {
      this.UserList = data;
    });
  }
  openShareModal(id: number) {
    if (id) {
      this.diagramID = id;
      this.shareModal = true;
    }
    
  }
  closeShareModal() {
    this.shareModal = false;
  }
  onToggleChange() {
    console.log(this.shareOption);
  }
  onUserCheckboxChange(event: any) {
    const userId = +event.target.value;

    if (event.target.checked) {
      if (!this.selectedUserIds.includes(userId)) {
        this.selectedUserIds.push(userId);
      }
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
    }
  }
  saveSelectedUsers() {
    const createdID = this.user.id;
    this.DiagramsInfo.is_shareable = this.shareOption;
    this.DiagramsServices.updateSharedAccess(this.DiagramsInfo.is_shareable , this.diagramID!).subscribe(()=> {

    })
    this.selectedUserIds.forEach(userId => {
      const sharedAccess: Shared = {
        diagram_id: this.diagramID,
        user_id: userId,
        created_by: createdID,
      };
      this.SharedServices.storeSharedAccess(sharedAccess).subscribe({
        next: () => console.log(`Shared with user ID: ${userId}`),
        error: err => console.error(err)
      });
    });
    this.selectedUserIds = [];
  }
  viewDiagrams(id: number) {
    if (id) {
      this.diagramID = id;
      this.router.navigate(['/home', 'displayDiagram', this.diagramID]);
    }
  }
  newDiagram() {
    this.router.navigate(['/home', 'createDiagram']);
  }
}
