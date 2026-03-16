import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from './core/services/theme.service';
import { SupabaseService } from './core/services/supabse.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

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
  readonly supabaseService = inject(SupabaseService);
  readonly sidebarCollapsed = signal(false);

  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  readonly isAuthPage = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects.startsWith('/auth'))
    ),
    { initialValue: this.router.url.startsWith('/auth') }
  );

  readonly navItems: NavItem[] = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/meters', icon: 'speed', label: 'Zähler' },
    { path: '/readings', icon: 'history', label: 'Ablesungen' },
    { path: '/reports', icon: 'bar_chart', label: 'Auswertungen' },
    { path: '/settings', icon: 'settings', label: 'Einstellungen' },
  ];

  readonly toggleBtnLeft = computed(() =>
    this.sidebarCollapsed() ? '62px' : '228px'
  );

  readonly connectionColor = computed(() => {
    switch (this.supabaseService.connectionStatus()) {
      case 'connected': return 'var(--color-primary)';
      case 'error': return '#EF4444';
      case 'checking': return '#F59E0B';
    }
  });

  readonly connectionTooltip = computed(() => {
    switch (this.supabaseService.connectionStatus()) {
      case 'connected': return 'Verbunden';
      case 'error': return 'Keine Verbindung';
      case 'checking': return 'Verbinde...';
    }
  });

  async logout(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/auth']);
  }
}