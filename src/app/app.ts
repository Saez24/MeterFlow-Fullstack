import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from './core/services/theme.service';
import { SupabaseService } from './core/services/supabse.service';

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

  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/auth']);
  }
}
