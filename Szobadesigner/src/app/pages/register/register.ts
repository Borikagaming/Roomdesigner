import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { getPasswordPolicyHint, getPasswordValidationError } from '../../utils/password-policy';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  imports: [FormsModule, CommonModule],
  styleUrls: ['./register.css'],
  standalone: true,
})
export class RegisterComponent {
  readonly passwordPolicyHint = getPasswordPolicyHint();

  user = {
    username: '',
    email: '',
    password: '',
  };

  passwordConfirm = '';
  gdprAccepted = false;
  termsAccepted = false;
  registerError: string | null = null;
  registerSuccess: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  private getRegisterFailureReason(err: any): string {
    const rawMessage =
      err?.error?.message ||
      err?.error?.error ||
      (typeof err?.error === 'string' ? err.error : '') ||
      err?.message ||
      '';

    const trimmedMessage = String(rawMessage).trim().replace(/\s+/g, ' ');
    if (trimmedMessage) {
      return trimmedMessage.replace(/[.!]+$/, '');
    }

    if (err?.status === 500) {
      return 'szerveroldali hiba';
    }

    return 'ismeretlen hiba';
  }

  async onRegister(): Promise<void> {
    this.registerError = null;

    if (!this.gdprAccepted || !this.termsAccepted) {
      this.registerError = 'A regisztrációhoz el kell fogadnod az adatkezelési tájékoztatót és az ÁSZF-et.';
      return;
    }

    const passwordValidationError = getPasswordValidationError(this.user.password);
    if (passwordValidationError) {
      this.registerError = passwordValidationError;
      return;
    }

    if (this.user.password !== this.passwordConfirm) {
      this.registerError = 'A jelszavak nem egyeznek.';
      return;
    }

    const payload = {
      name: this.user.username,
      email: this.user.email,
      password: this.user.password,
      accepted_gdpr: this.gdprAccepted,
      accepted_terms: this.termsAccepted,
    };

    this.http.post('http://127.0.0.1:8000/api/register', payload).subscribe({
      next: (res: any) => {
        this.registerSuccess = res?.message || 'Regisztráció sikeres.';

        const loginPayload = { email: this.user.email, password: this.user.password };
        this.http.post('http://127.0.0.1:8000/api/login', loginPayload).subscribe({
          next: (loginRes: any) => {
            if (loginRes?.token && loginRes?.user) {
              localStorage.setItem('token', loginRes.token);
              localStorage.setItem('user', JSON.stringify(loginRes.user));
              this.router.navigate(['/roomdesigner']);
            } else {
              sessionStorage.setItem('prefillLoginEmail', this.user.email || '');
              setTimeout(() => {
                this.registerSuccess = null;
                this.router.navigate(['/login']);
              }, 1200);
            }
          },
          error: (loginErr: any) => {
            console.error('Auto-login sikertelen', loginErr);
            sessionStorage.setItem('prefillLoginEmail', this.user.email || '');
            setTimeout(() => {
              this.registerSuccess = null;
              this.router.navigate(['/login']);
            }, 1200);
          },
        });
      },
      error: (err: any) => {
        console.error('Hiba történt!', err);

        if (err?.status === 403 && err?.error?.ban) {
          sessionStorage.setItem('prefillLoginEmail', this.user.email || err.error.ban.email || '');
          this.registerError =
            'Ehhez az e-mail címhez tiltás tartozik. A bejelentkezés oldalon fellebbezést tudsz küldeni.';
          return;
        }

        const reason = this.getRegisterFailureReason(err);
        this.registerError = `Regisztráció sikertelen (${reason}).`;
      },
    });
  }
}
