import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  currentUser: any = null;
  showDropdown = false;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.checkLoginStatus();

    this.router.events.subscribe(() => {
      this.checkLoginStatus();
      this.showDropdown = false;
    });
  }

  checkLoginStatus(): void {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      this.isLoggedIn = false;
      this.currentUser = null;
      return;
    }

    try {
      this.currentUser = JSON.parse(userJson);
      this.isLoggedIn = true;
    } catch {
      this.isLoggedIn = false;
      this.currentUser = null;
    }
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  isAdmin(): boolean {
    return !!this.currentUser?.is_admin;
  }

  navigateTo(path: string): void {
    this.showDropdown = false;
    this.router.navigate([path]);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn = false;
    this.currentUser = null;
    this.showDropdown = false;
    this.router.navigate(['/login']);
  }
}
