import { Injectable, inject } from '@angular/core';
import { EnergyService } from './energy.service';
import { ENERGY_META } from '../models/energy.models';

export interface MeterSummary {
  consumption: number;
  cost: number;
  unit: string;
  consumptionKwh?: number;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly energyService = inject(EnergyService);

  getMeterSummary(meterId: string, year: number): MeterSummary | null {
    const yearStats = this.energyService.getYearStats(year);
    const meterStats = yearStats.byMeter[meterId];

    if (!meterStats) return null;

    const meter = this.energyService.getMeter(meterId);
    if (!meter) return null;

    // Anzahl Monate mit tatsächlichen Daten für diesen Zähler
    const monthsWithData = yearStats.months.filter(
      (m) => m.byMeter[meterId] !== undefined
    );

    const baseChargeCost = monthsWithData.reduce((sum, month) => {
      const tariff = this.energyService.getActiveTariffForDate(
        meter,
        new Date(year, month.month - 1),
      );
      return sum + (tariff ? tariff.baseCharge : 0);
    }, 0);

    // Gesamtkosten = Verbrauchskosten + anteilige Grundgebühr
    const totalCost = meterStats.cost + baseChargeCost;

    const unit = ENERGY_META[meter.type].unit;

    let consumptionKwh: number | undefined;
    if (meter.type === 'gas') {
      consumptionKwh = this.energyService
        .getReadingsForMeter(meterId)
        .filter((r) => new Date(r.date).getFullYear() === year)
        .reduce((sum, reading) => sum + (reading.kwh ?? 0), 0);
    }

    return {
      consumption: meterStats.consumption,
      cost: totalCost,
      unit,
      consumptionKwh,
    };
  }
}