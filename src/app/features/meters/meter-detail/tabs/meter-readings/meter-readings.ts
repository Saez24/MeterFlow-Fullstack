import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReadingService } from '../../../../../core/services/reading.service';
import { MeterDetailStateService } from '../../../../../core/services/meter-detail-state.service';
import { MeterConfig } from '../../../../../core/models/energy.models';

@Component({
  selector: 'app-meter-readings',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './meter-readings.html',
  styleUrl: './meter-readings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterReadings {
  private readonly readingService = inject(ReadingService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = inject(MeterDetailStateService);

  meter = this.state.meter;
  readings = this.state.readings;
  activePhoto = signal<string | null>(null);

  deleteReading(id: string): void {
    if (confirm('Ablesung löschen?')) {
      this.readingService.deleteReading(id);
      this.snackBar.open('Ablesung gelöscht', 'OK', { duration: 2000 });
    }
  }
}
