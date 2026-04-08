import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  imports: [FormsModule, CommonModule],
  styleUrls: ['./login.css'],
})
export class LoginComponent implements OnInit {
  loginData = { identifier: '', password: '' };
  loginError: string | null = null;
  gdprAccepted = false;

  showAppealForm = false;
  appealEmail = '';
  appealMessage = '';
  appealReason: string | null = null;
  appealError: string | null = null;
  appealSuccess: string | null = null;
  isSubmittingAppeal = false;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const prefill = sessionStorage.getItem('prefillLoginEmail');
    if (prefill) {
      this.loginData.identifier = prefill;
      sessionStorage.removeItem('prefillLoginEmail');
    }
  }

  private resetAppealFeedback(): void {
    this.appealError = null;
    this.appealSuccess = null;
  }

  private clearAppealState(): void {
    this.showAppealForm = false;
    this.appealEmail = '';
    this.appealMessage = '';
    this.appealReason = null;
    this.resetAppealFeedback();
    this.isSubmittingAppeal = false;
  }

  onLogin(): void {
    if (!this.gdprAccepted) {
      this.loginError = 'Az adatvédelmi tájékoztató elfogadása kötelező!';
      return;
    }

    this.loginError = null;
    this.resetAppealFeedback();

    const payload = {
      identifier: this.loginData.identifier,
      email: this.loginData.identifier,
      password: this.loginData.password,
    };

    this.http.post('http://127.0.0.1:8000/api/login', payload).subscribe({
      next: (res: any) => {
        this.clearAppealState();

        if (res?.token && res?.user) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.router.navigate([res.user?.is_admin ? '/admin' : '/roomdesigner']);
        } else {
          this.loginError = 'Hibás válasz érkezett a szervertől.';
        }
      },
      error: (err: any) => {
        console.error('Login hiba:', err);
        const serverMessage =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : typeof err?.message === 'string'
              ? err.message
              : null;

        this.loginError = serverMessage?.trim()
          ? serverMessage
          : 'Hibás e-mail, felhasználónév vagy jelszó!';

        const ban = err?.error?.ban;
        if (err?.status === 403 && ban) {
          this.showAppealForm = true;
          this.appealReason = typeof ban.reason === 'string' ? ban.reason : null;
          this.appealEmail =
            typeof ban.email === 'string' && ban.email.trim()
              ? ban.email.trim()
              : this.loginData.identifier.trim();
        } else {
          this.clearAppealState();
        }
      },
    });
  }

  submitAppeal(): void {
    const email = this.appealEmail.trim();
    const message = this.appealMessage.trim();

    if (!email) {
      this.appealError = 'A fellebbezéshez add meg az érintett e-mail címet.';
      return;
    }

    if (!message) {
      this.appealError = 'Írd le röviden, miért szeretnéd felülvizsgáltatni a tiltást.';
      return;
    }

    this.isSubmittingAppeal = true;
    this.resetAppealFeedback();

    this.http.post('http://127.0.0.1:8000/api/banned-emails/appeal', { email, message }).subscribe({
      next: (response: any) => {
        this.appealSuccess = response?.message || 'A fellebbezés sikeresen elküldve.';
        this.appealMessage = '';
        this.appealEmail = email;
        this.appealReason =
          typeof response?.ban?.reason === 'string' ? response.ban.reason : this.appealReason;
        this.isSubmittingAppeal = false;
      },
      error: (error: any) => {
        this.appealError = error?.error?.message || 'Nem sikerült elküldeni a fellebbezést.';
        this.isSubmittingAppeal = false;
      },
    });
  }
}
