import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { EnergyService } from '../../core/services/energy.service';
import { ENERGY_META } from '../../core/models/energy.models';

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
})
export class Readings {
  private readonly energyService = inject(EnergyService);
  private readonly snackBar = inject(MatSnackBar);

  readonly meters = this.energyService.meters;
  filterMeterId = '';

  readonly filteredReadings = computed(() => {
    const all = [...this.energyService.readings()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (!this.filterMeterId) return all;
    return all.filter((r) => r.meterId === this.filterMeterId);
  });

  getMeter(id: string) {
    return this.energyService.getMeter(id);
  }

  getMeta(type: string) {
    return ENERGY_META[type as keyof typeof ENERGY_META];
  }

  deleteReading(id: string): void {
    if (confirm('Ablesung wirklich löschen?')) {
      this.energyService.deleteReading(id);
      this.snackBar.open('Ablesung gelöscht', 'OK', { duration: 3000 });
    }
  }
}
