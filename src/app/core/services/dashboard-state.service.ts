// src/app/core/services/dashboard-state.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { EnergyService } from './energy.service';
import { StatsService } from './stats.service';
import { ENERGY_META } from '../models/energy.models';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
    private readonly energyService = inject(EnergyService);
    readonly statsService = inject(StatsService);

    // ============ GEMEINSAMER STATE ============
    readonly availableYears = this.energyService.availableYears;
    readonly activeMeters = this.energyService.activeMeters;
    readonly waterBills = this.energyService.waterBillStats;

    readonly selectedYear = signal(
        this.availableYears()[0] ?? new Date().getFullYear()
    );

    readonly yearStats = computed(() =>
        this.energyService.getYearStats(this.selectedYear())
    );

    readonly totalYearlyCost = this.energyService.totalYearlyCost;
    readonly activeCount = computed(() => this.activeMeters().length);

    readonly recentReadings = computed(() =>
        [...this.energyService.readings()]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 8)
    );

    readonly waterBillsForYear = computed(() =>
        this.waterBills().filter((b) => b.year === this.selectedYear())
    );

    readonly waterTotals = computed(() => {
        const bills = this.waterBillsForYear();
        return {
            totalM3: bills.reduce((s, b) => s + b.totalConsumption, 0),
            gardenM3: bills.reduce((s, b) => s + b.gardenConsumption, 0),
            billableM3: bills.reduce((s, b) => s + b.billableWastewater, 0),
            freshCost: bills.reduce((s, b) => s + b.freshwaterCost, 0),
            wasteCost: bills.reduce((s, b) => s + b.wastewaterCost, 0),
            total: bills.reduce((s, b) => s + b.totalCost, 0),
        };
    });

    readonly totalYearCostWithBase = computed(() => {
        const stats = this.yearStats();
        const meters = this.activeMeters();

        // Monate mit Daten pro Zähler summieren
        const baseTotal = meters.reduce((sum, meter) => {
            const monthsWithData = stats.months.filter(
                (m) => m.byMeter[meter.id] !== undefined
            ).length;
            return sum + meter.baseCharge * monthsWithData;
        }, 0);

        return stats.totalCost + baseTotal;
    });

    // ============ HILFSMETHODEN ============
    getMeta(type: string) {
        return ENERGY_META[type as keyof typeof ENERGY_META];
    }

    getMeterById(id: string) {
        return this.energyService.getMeter(id);
    }

    latestReading(meterId: string) {
        return this.energyService.latestReadings().get(meterId);
    }

    getMonthStats(year: number) {
        return this.energyService.getMonthStats(year);
    }
}