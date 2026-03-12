import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from './core/services/theme.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('MeterFlow');
  readonly themeService = inject(ThemeService);
  readonly sidebarCollapsed = signal(false);
  readonly navItems: NavItem[] = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/meters', icon: 'speed', label: 'Zähler' },
    { path: '/readings', icon: 'history', label: 'Ablesungen' },
    { path: '/reports', icon: 'bar_chart', label: 'Auswertungen' },
    { path: '/settings', icon: 'settings', label: 'Einstellungen' },
  ];
}
