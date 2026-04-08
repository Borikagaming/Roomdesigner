import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { getPasswordPolicyHint, getPasswordValidationError } from '../../utils/password-policy';

interface SettingsFormData {
  name: string;
  email: string;
  profile_image: string;
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})
export class SettingsComponent implements OnInit {
  readonly passwordPolicyHint = getPasswordPolicyHint();
  showPasswordFields = false;

  userData: SettingsFormData = {
    name: '',
    email: '',
    profile_image: '',
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  };

  settingsError: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(savedUser);
    this.userData.name = user.name || '';
    this.userData.email = user.email || '';
    this.userData.profile_image = user.profile_image || '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.userData.profile_image = (reader.result as string) || '';
    };
    reader.readAsDataURL(file);
  }

  deleteProfileImage(): void {
    if (confirm('Biztosan törölni szeretnéd a profilképedet?')) {
      this.userData.profile_image = '';
    }
  }

  deleteProfile(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http.delete('http://127.0.0.1:8000/api/user/delete', { headers }).subscribe({
      next: () => {
        alert('Profil sikeresen törölve!');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
        setTimeout(() => window.location.reload(), 100);
      },
      error: (err: any) => {
        const serverMessage = err?.error?.message || err?.message || '';
        this.settingsError = serverMessage || 'Hiba történt a törléskor!';
      },
    });
  }

  private resetPasswordFields(): void {
    this.userData.current_password = '';
    this.userData.new_password = '';
    this.userData.new_password_confirm = '';
  }

  togglePasswordFields(): void {
    this.showPasswordFields = !this.showPasswordFields;

    if (!this.showPasswordFields) {
      this.resetPasswordFields();
      this.settingsError = null;
    }
  }

  saveSettings(): void {
    this.settingsError = null;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const wantsPasswordChange = this.showPasswordFields;

    if (wantsPasswordChange) {
      if (!this.userData.current_password.trim()) {
        this.settingsError = 'A jelszó módosításához add meg a jelenlegi jelszavadat.';
        return;
      }

      if (!this.userData.new_password.trim() || !this.userData.new_password_confirm.trim()) {
        this.settingsError = 'Az új jelszót kétszer kell megadni.';
        return;
      }

      const passwordValidationError = getPasswordValidationError(this.userData.new_password);
      if (passwordValidationError) {
        this.settingsError = passwordValidationError;
        return;
      }

      if (this.userData.new_password !== this.userData.new_password_confirm) {
        this.settingsError = 'Az új jelszavak nem egyeznek!';
        return;
      }
    }

    const payload: Record<string, string> = {
      name: this.userData.name,
      email: this.userData.email,
      profile_image: this.userData.profile_image,
    };

    if (wantsPasswordChange) {
      payload['current_password'] = this.userData.current_password;
      payload['new_password'] = this.userData.new_password;
      payload['new_password_confirm'] = this.userData.new_password_confirm;
    }

    this.http.put('http://127.0.0.1:8000/api/user/update', payload, { headers }).subscribe({
      next: (res: any) => {
        alert('Sikeres módosítás!');
        localStorage.setItem('user', JSON.stringify(res.user));
        this.resetPasswordFields();
        this.router.navigate(['/roomdesigner']);
      },
      error: (err: any) => {
        const serverMessage = err?.error?.message || err?.message || '';
        this.settingsError = serverMessage || 'Hiba történt a mentéskor!';
      },
    });
  }
}
