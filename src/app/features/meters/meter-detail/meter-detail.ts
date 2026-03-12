import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EnergyService } from '../../../core/services/energy.service';
import { ENERGY_META } from '../../../core/models/energy.models';

@Component({
  selector: 'app-meter-detail',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './meter-detail.html',
  styleUrl: './meter-detail.scss',
})
export class MeterDetail {
  private readonly energyService = inject(EnergyService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  private readonly meterId = signal(this.route.snapshot.paramMap.get('id') ?? '');

  readonly meter = computed(() => this.energyService.getMeter(this.meterId()));
  readonly readings = computed(() => this.energyService.getReadingsForMeter(this.meterId()));

  readonly latestReading = computed(() => this.readings()[0] ?? null);
  readonly lastConsumption = computed(() => this.readings()[0]?.consumption ?? null);

  getMeta(type: string) {
    return ENERGY_META[type as keyof typeof ENERGY_META];
  }

  deleteReading(id: string): void {
    if (confirm('Ablesung löschen?')) {
      this.energyService.deleteReading(id);
      this.snackBar.open('Ablesung gelöscht', 'OK', { duration: 2000 });
    }
  }
}
