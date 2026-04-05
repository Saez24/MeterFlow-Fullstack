import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ThemeService } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Router } from '@angular/router';
import { MeterService } from '../../core/services/meter.service';
import { ReadingService } from '../../core/services/reading.service';
import { DataSyncService } from '../../core/services/data-sync.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatSnackBarModule, MatDialogModule, MatSlideToggleModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly themeService = inject(ThemeService);
  private readonly meterService = inject(MeterService);
  private readonly readingService = inject(ReadingService);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly dialog = inject(MatDialog);

  readonly notificationService = inject(NotificationService);
  readonly themeMode = this.themeService.mode;

  meterCount() {
    return this.meterService.meters().length;
  }
  readingCount() {
    return this.readingService.readings().length;
  }

  setTheme(mode: 'light' | 'dark' | 'system'): void {
    this.themeService.setMode(mode);
  }

  exportData(): void {
    const json = this.dataSyncService.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meterflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open($localize`:@@settings.exported:Daten exportiert`, 'OK', { duration: 3000 });
  }

  importData(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.dataSyncService.importData(e.target?.result as string);
        this.snackBar.open($localize`:@@settings.imported:Daten importiert`, 'OK', { duration: 3000 });
      } catch {
        this.snackBar.open($localize`:@@settings.importError:Fehler beim Import`, 'OK', { duration: 3000 });
      }
    };
    reader.readAsText(file);
  }

  clearAll(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: $localize`:@@settings.deleteAll.title:Alle Daten löschen`,
          message: $localize`:@@settings.deleteAll.message:Alle Daten wirklich löschen? Diese Aktion kann nicht rükgängig gemacht werden!`,
          confirmLabel: $localize`:@@settings.deleteAll.confirm:Alles löschen`,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        localStorage.clear();
        window.location.reload();
      });
  }

  async sendTestNotification(): Promise<void> {
    await this.notificationService.showTestNotification();
  }

  async logout(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/auth']);
  }
}
