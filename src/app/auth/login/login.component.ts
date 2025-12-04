import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, UserLock, RectangleEllipsis, CircleX } from 'lucide-angular';
import { AuthService } from '../../Services/Auth/auth-services.service';
import { User } from '../../Models/User/user.model';

declare const google: any;

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
  readonly CloseIcon = CircleX;

  userFilter = '';
  filteredUsers: User[] = [];

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
    this.waitForGoogle();
  }
  waitForGoogle() {
    const check = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        clearInterval(check);
        this.initializeGoogleLogin();
      }
    }, 100);
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

  // -----------------------
  // GOOGLE LOGIN
  // -----------------------
  initializeGoogleLogin() {
    google.accounts.id.initialize({
      client_id: '1082301013663-app75h83b1jqg7bbn3threhfued4ga6m.apps.googleusercontent.com',
      callback: (response: any) => this.handleGoogleResponse(response),
    });

    google.accounts.id.renderButton(
      document.getElementById('googleBtn'),
      {
        theme: "filled_blue",
        size: "large",
        shape: "rectangular",
        width: "300"
      }
    );
  }

  handleGoogleResponse(response: any) {
    const token = response.credential;

    this.authServices.googleLogin(token).subscribe({
      next: (res: any) => {
        this.loading = false;

        // Save token both places
        localStorage.setItem('token', res.access_token);
        this.authServices.token.set(res.access_token);

        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMessage = "Google Login failed.";
      }
    });
  }

  // -----------------------
  // USER REGISTRATION MODAL
  // -----------------------
  openRegistration() {
    this.UserRegistrationModal = true;
  }

  displayUsersList() {
    this.authServices.displayuserList().subscribe((data) => {
      this.UserList = data;
      this.filteredUsers = data;
    });
  }

  applyFilter() {
    const filterValue = this.userFilter.toLowerCase();

    this.filteredUsers = this.UserList.filter(user =>
      `${user.firstname} ${user.lastname}`.toLowerCase().includes(filterValue)
    );
  }

  registerUser(s_bpartner_employee_id: number) {
    if (s_bpartner_employee_id) {
      this.router.navigate([`/register/${s_bpartner_employee_id}`]);
    }
  }
}
