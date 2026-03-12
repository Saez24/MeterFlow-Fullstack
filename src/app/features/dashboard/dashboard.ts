import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { EnergyService } from '../../core/services/energy.service';
import { ENERGY_META } from '../../core/models/energy.models';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatRippleModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly energyService = inject(EnergyService);

  readonly activeMeters = this.energyService.activeMeters;
  readonly totalMonthly = this.energyService.totalMonthlyCost;

  readonly activeCount = computed(() => this.energyService.activeMeters().length);
  readonly readingCount = computed(() => this.energyService.readings().length);

  readonly recentReadings = computed(() => {
    return [...this.energyService.readings()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  });

  getMeta(type: string) {
    return ENERGY_META[type as keyof typeof ENERGY_META];
  }

  getMeterById(id: string) {
    return this.energyService.getMeter(id);
  }

  latestReading(meterId: string) {
    return this.energyService.latestReadings().get(meterId);
  }

  stats(meterId: string) {
    return this.energyService.dashboardStats()[meterId];
  }
}
