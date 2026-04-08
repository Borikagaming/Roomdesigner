import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface AdminRoomSummary {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AdminUserSummary {
  id: number;
  name: string;
  username?: string | null;
  email: string;
  profile_image?: string | null;
  is_admin: boolean;
  room_count: number;
  rooms: AdminRoomSummary[];
}

interface AdminBannedEmailSummary {
  id: number;
  email: string;
  archived_name?: string | null;
  archived_username?: string | null;
  reason: string;
  appeal_message?: string | null;
  appeal_submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  banned_by_name?: string | null;
  can_restore_user?: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent implements OnInit {
  users: AdminUserSummary[] = [];
  bannedEmails: AdminBannedEmailSummary[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  activeRoomKey = '';
  banningUserId: number | null = null;
  unbanningBanId: number | null = null;
  banReasons: Record<number, string> = {};

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.is_admin) {
      this.router.navigate(['/login']);
      return;
    }

    void this.loadUsers();
  }

  private getCurrentUser(): any {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token
      ? new HttpHeaders({
          Authorization: `Bearer ${token}`,
        })
      : new HttpHeaders();
  }

  private resolveErrorMessage(error: any, fallbackMessage: string): string {
    const serverMessage =
      typeof error?.error?.message === 'string'
        ? error.error.message.trim()
        : typeof error?.message === 'string'
          ? error.message.trim()
          : '';

    if (!serverMessage) {
      return fallbackMessage;
    }

    const normalizedMessage = serverMessage.toLowerCase();
    if (
      normalizedMessage.includes('appeal_submitted_at') ||
      normalizedMessage.includes('appeal_message') ||
      normalizedMessage.includes('archived_password') ||
      normalizedMessage.includes('archived_name') ||
      normalizedMessage.includes('archived_username') ||
      normalizedMessage.includes('archived_email_verified_at') ||
      normalizedMessage.includes('archived_profile_image') ||
      (normalizedMessage.includes('unknown column') && normalizedMessage.includes('banned_emails'))
    ) {
      return 'Az új tiltás-, fellebbezés- és felhasználó-visszaállítás kezeléshez még hiányzik egy adatbázis-frissítés. Futtasd le a backend migrációkat, majd frissítsd az oldalt.';
    }

    if (normalizedMessage.includes('sqlstate')) {
      return 'Adatbázis-hiba történt a háttérben. Kérlek próbáld újra később.';
    }

    return serverMessage;
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response: any = await firstValueFrom(
        this.http.get('http://127.0.0.1:8000/api/admin/users', {
          headers: this.getAuthHeaders(),
        }),
      );

      this.users = Array.isArray(response?.data) ? response.data : [];
      this.bannedEmails = Array.isArray(response?.banned_emails) ? response.banned_emails : [];
    } catch (error: any) {
      this.errorMessage = this.resolveErrorMessage(error, 'Nem sikerült betölteni az admin felület adatait.');
      console.error('Admin adatok betöltési hiba:', error);
      if (error?.status === 401 || error?.status === 403) {
        this.router.navigate(['/login']);
      }
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Ismeretlen időpont';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Ismeretlen időpont';
    }

    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsedDate);
  }

  async loadRoomInDesigner(user: AdminUserSummary, room: AdminRoomSummary): Promise<void> {
    const roomKey = `${user.id}:${room.id}`;
    this.activeRoomKey = roomKey;
    this.errorMessage = '';

    try {
      const response: any = await firstValueFrom(
        this.http.get(`http://127.0.0.1:8000/api/admin/users/${user.id}/rooms/${room.id}`, {
          headers: this.getAuthHeaders(),
        }),
      );

      const roomData = response?.data;
      if (!roomData?.layout_data) {
        this.errorMessage = 'A kiválasztott szobához nem tartozik betölthető terv.';
        return;
      }

      sessionStorage.setItem(
        'roomdesignerPendingLayout',
        JSON.stringify({
          layout: roomData.layout_data,
          roomName: roomData.name || room.name,
          source: 'admin',
          ownerName: user.name,
        }),
      );

      this.router.navigate(['/roomdesigner']);
    } catch (error: any) {
      this.errorMessage = this.resolveErrorMessage(error, 'Nem sikerült betölteni a kiválasztott szobát.');
      console.error('Admin szobabetöltési hiba:', error);
    } finally {
      this.activeRoomKey = '';
    }
  }

  async banUser(user: AdminUserSummary): Promise<void> {
    const reason = (this.banReasons[user.id] || '').trim();
    if (!reason) {
      this.errorMessage = 'A bannoláshoz meg kell adni az indokot.';
      return;
    }

    this.banningUserId = user.id;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response: any = await firstValueFrom(
        this.http.post(
          `http://127.0.0.1:8000/api/admin/users/${user.id}/ban`,
          { reason },
          { headers: this.getAuthHeaders() },
        ),
      );

      this.banReasons[user.id] = '';
      this.successMessage = response?.message || 'A felhasználó bannolva lett.';
      await this.loadUsers();
    } catch (error: any) {
      this.errorMessage = this.resolveErrorMessage(error, 'Nem sikerült bannolni a felhasználót.');
      console.error('Admin bannolási hiba:', error);
    } finally {
      this.banningUserId = null;
    }
  }

  async unbanUser(bannedEmail: AdminBannedEmailSummary): Promise<void> {
    this.unbanningBanId = bannedEmail.id;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response: any = await firstValueFrom(
        this.http.delete(`http://127.0.0.1:8000/api/admin/banned-emails/${bannedEmail.id}`, {
          headers: this.getAuthHeaders(),
        }),
      );

      this.successMessage = response?.message || 'A tiltás feloldva.';
      await this.loadUsers();
    } catch (error: any) {
      this.errorMessage = this.resolveErrorMessage(error, 'Nem sikerült feloldani a tiltást.');
      console.error('Admin unban hiba:', error);
    } finally {
      this.unbanningBanId = null;
    }
  }
}
