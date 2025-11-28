import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, UserLock, RectangleEllipsis } from 'lucide-angular';
import { AuthService } from '../../Services/Auth/auth-services.service';
import { User } from '../../Models/User/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  readonly Usericon = UserLock;
  readonly PassIcon = RectangleEllipsis;

  username = '';
  password = '';
  loading = false;
  UserRegistrationModal = false;
  errorMessage = '';
  UserList: User[] = [];

  constructor(
    private authServices: AuthService,
    private router: Router,
  ) {}
  ngOnInit(): void {
    this.displayUsersList();
  }

  login() {
    this.loading = true;
    this.errorMessage = '';

    this.authServices.login({ username: this.username, password: this.password })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message ?? 'Login failed';
        }
      });
  }
  openRegistration(){
    this.UserRegistrationModal = true;
  }

  displayUsersList(){
    this.authServices.displayuserList().subscribe((data) => {
      this.UserList = data;
    });
  }

  registerUser(s_bpartner_employee_id : number){
    if (s_bpartner_employee_id) {
      this.router.navigate(['/register'], { queryParams: { id: s_bpartner_employee_id } });
    }
  }
}
