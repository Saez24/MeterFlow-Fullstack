import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ENERGY_META } from '../../core/models/energy.models';
import { MeterService } from '../../core/services/meter.service';
import { ReadingService } from '../../core/services/reading.service';

@Component({
  selector: 'app-readings',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    FormsModule,
  ],
  templateUrl: './readings.html',
  styleUrl: './readings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Readings {
  private readonly meterService = inject(MeterService);
  private readonly readingService = inject(ReadingService);
  private readonly snackBar = inject(MatSnackBar);

  readonly meters = this.meterService.meters;
  readonly filterMeterId = signal<string>('');

  readonly filteredReadings = computed(() => {
    const all = [...this.readingService.readings()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const filter = this.filterMeterId();
    if (!filter) return all;
    return all.filter((r) => r.meterId === filter);
  });

  getMeter(id: string) {
    return this.meterService.getMeter(id);
  }

  getMeta(type: string) {
    return ENERGY_META[type as keyof typeof ENERGY_META];
  }

  deleteReading(id: string): void {
    if (confirm('Ablesung wirklich löschen?')) {
      this.readingService.deleteReading(id);
      this.snackBar.open('Ablesung gelöscht', 'OK', { duration: 3000 });
    }
  }
}
