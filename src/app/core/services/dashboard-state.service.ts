import { Injectable, inject, signal, computed } from '@angular/core';
import { StatsService } from './stats.service';
import {
  ENERGY_META,
  MeterConfig,
  TariffPeriod,
} from '../models/energy.models';
import { MeterService } from './meter.service';
import { ReadingService } from './reading.service';
import { TariffService } from './tariff.service';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
    private readonly meterService = inject(MeterService);
    private readonly readingService = inject(ReadingService);
    private readonly tariffService = inject(TariffService);
    readonly statsService = inject(StatsService);

    // ============ GEMEINSAMER STATE ============
    readonly availableYears = this.statsService.availableYears;
    readonly activeMeters = this.meterService.activeMeters;
    readonly waterBills = this.statsService.waterBillStats;

    readonly selectedYear = signal(
        this.availableYears()[0] ?? new Date().getFullYear()
    );

    readonly yearStats = computed(() =>
        this.statsService.getYearStats(this.selectedYear())
    );

    readonly activeCount = computed(() => this.activeMeters().length);

    readonly recentReadings = computed(() =>
        [...this.readingService.readings()]
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
      // Gekoppelte Gartenwasserzähler haben keine Grundgebühr
      if (meter.type === 'garden_water' && meter.linkedWaterMeterId) {
        return sum;
      }
      
      const monthsWithData = stats.months.filter(
        (m) => m.byMeter[meter.id] !== undefined,
      );

      const totalBaseChargeForMeter = monthsWithData.reduce((monthlySum, month) => {
        const tariff = this.tariffService.getActiveTariffForDate(
          meter,
          new Date(stats.year, month.month - 1),
        );
        return monthlySum + (tariff?.baseCharge ?? 0);
      }, 0);

      return sum + totalBaseChargeForMeter;
    }, 0);

        return stats.totalCost + baseTotal;
      });
    
      // ============ HILFSMETHODEN ============
      getYearTotalCost(year: number): number {
        const stats = this.statsService.getYearStats(year);
        const meters = this.activeMeters();
    
        // Monate mit Daten pro Zähler summieren
        const baseTotal = meters.reduce((sum, meter) => {
          // Gekoppelte Gartenwasserzähler haben keine Grundgebühr
          if (meter.type === 'garden_water' && meter.linkedWaterMeterId) {
            return sum;
          }
      
          const monthsWithData = stats.months.filter(
            (m) => m.byMeter[meter.id] !== undefined,
          );
    
          const totalBaseChargeForMeter = monthsWithData.reduce((monthlySum, month) => {
            const tariff = this.tariffService.getActiveTariffForDate(
              meter,
              new Date(stats.year, month.month - 1),
            );
            return monthlySum + (tariff?.baseCharge ?? 0);
          }, 0);
    
          return sum + totalBaseChargeForMeter;
        }, 0);
    
        return stats.totalCost + baseTotal;
      }
      
        getActiveTariff(meter: MeterConfig): TariffPeriod | null {
          if (meter.type === 'garden_water' && meter.linkedWaterMeterId) {
            return null;
          }
          return this.tariffService.getActiveTariffForDate(meter, new Date());
        }
              
    getMeta(type: string) {
        return ENERGY_META[type as keyof typeof ENERGY_META];
    }

    getMeterById(id: string) {
        return this.meterService.getMeter(id);
    }

    latestReading(meterId: string) {
        return this.readingService.latestReadings().get(meterId);
    }

    getMonthStats(year: number) {
        return this.statsService.getMonthStats(year);
    }
}