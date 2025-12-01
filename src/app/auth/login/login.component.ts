import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, UserLock, RectangleEllipsis } from 'lucide-angular';
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
    this.initializeGoogleLogin();
  }

  /** -------------------------
   *  NORMAL LOGIN
   * --------------------------*/
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

        // Store token for future API calls
        localStorage.setItem('token', res.access_token);
        this.authServices.token.set(res.access_token);

        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMessage = "Google Login failed.";
      }
    });
  }


  /** -------------------------
   *  USER REGISTRATION MODAL
   * --------------------------*/
  openRegistration() {
    this.UserRegistrationModal = true;
  }

  displayUsersList() {
    this.authServices.displayuserList().subscribe((data) => {
      this.UserList = data;
    });
  }

  registerUser(s_bpartner_employee_id: number) {
    if (s_bpartner_employee_id) {
      this.router.navigate(['/register'], { queryParams: { id: s_bpartner_employee_id } });
    }
  }
}
