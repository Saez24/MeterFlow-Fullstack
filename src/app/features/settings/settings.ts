import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ThemeService } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabse.service';
import { Router } from '@angular/router';
import { MeterService } from '../../core/services/meter.service';
import { ReadingService } from '../../core/services/reading.service';
import { DataSyncService } from '../../core/services/data-sync.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatSnackBarModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly themeService = inject(ThemeService);
  private readonly meterService = inject(MeterService);
  private readonly readingService = inject(ReadingService);
  private readonly dataSyncService = inject(DataSyncService);
  private readonly snackBar = inject(MatSnackBar);

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
    a.download = `energiemon-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Daten exportiert', 'OK', { duration: 3000 });
  }

  importData(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.dataSyncService.importData(e.target?.result as string);
        this.snackBar.open('Daten importiert', 'OK', { duration: 3000 });
      } catch {
        this.snackBar.open('Fehler beim Import', 'OK', { duration: 3000 });
      }
    };
    reader.readAsText(file);
  }

  clearAll(): void {
    if (
      confirm('Alle Daten wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!')
    ) {
      localStorage.clear();
      window.location.reload();
    }
  }
}
