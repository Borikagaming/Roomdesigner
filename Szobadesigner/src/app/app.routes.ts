import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((module) => module.Landing),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((module) => module.RegisterComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((module) => module.LoginComponent),
  },
  {
    path: 'roomdesigner',
    loadComponent: () =>
      import('./pages/roomdesigner/roomdesigner').then((module) => module.RoomdesignerComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then((module) => module.AdminComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then((module) => module.SettingsComponent),
  },
  {
    path: 'gdpr',
    loadComponent: () => import('./pages/gdpr').then((module) => module.GdprComponent),
  },
  {
    path: 'aszf',
    loadComponent: () => import('./pages/aszf').then((module) => module.AszfComponent),
  },
];
