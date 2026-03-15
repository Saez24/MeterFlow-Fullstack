// src/app/features/meters/meters.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EnergyService } from '../../core/services/energy.service';
import { ENERGY_META, MeterConfig } from '../../core/models/energy.models';

@Component({
  selector: 'app-meters',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatDividerModule,
  ],
  templateUrl: './meters.html',
  styleUrl: './meters.scss',
})
export class Meters {
  private readonly energyService = inject(EnergyService);
  private readonly snackBar = inject(MatSnackBar);

  readonly meters = this.energyService.meters;

  getMeta(type: string) {
    return ENERGY_META[type as keyof typeof ENERGY_META];
  }

  readingCount(meterId: string): number {
    return this.energyService.getReadingsForMeter(meterId).length;
  }

  latestReading(meterId: string) {
    return this.energyService.latestReadings().get(meterId);
  }

  toggleActive(meter: MeterConfig): void {
    this.energyService.updateMeter(meter.id, { active: !meter.active });
  }

  deleteMeter(meter: MeterConfig): void {
    if (
      confirm(
        `Zähler "${meter.name}" wirklich löschen? Alle Ablesungen werden ebenfalls gelöscht.`,
      )
    ) {
      this.energyService.deleteMeter(meter.id);
      this.snackBar.open('Zähler gelöscht', 'OK', { duration: 3000 });
    }
  }

  /** Berechnet den effektiven Preis pro kWh für Gas (pricePerUnit ist €/m³) */
  getGasPricePerKwh(meter: MeterConfig): number {
    const calorificValue = meter.calorificValue ?? 10.55;
    const zNumber = meter.zNumber ?? 0.9672;
    return meter.pricePerUnit / (calorificValue * zNumber);
  }
}