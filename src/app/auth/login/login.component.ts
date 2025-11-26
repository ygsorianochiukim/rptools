import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, UserLock, RectangleEllipsis } from 'lucide-angular';
import { AuthService } from '../../Services/Auth/auth-services.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  readonly Usericon = UserLock;
  readonly PassIcon = RectangleEllipsis;

  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  login() {
    this.loading = true;
    this.errorMessage = '';

    this.auth.login({ username: this.username, password: this.password })
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
}
