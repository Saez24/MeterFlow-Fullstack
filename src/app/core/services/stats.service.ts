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
    ).length;

    // Grundgebühr nur für Monate mit Daten
    const baseChargeCost = meter.baseCharge * monthsWithData;

    // Gesamtkosten = Verbrauchskosten + anteilige Grundgebühr
    const totalCost = meterStats.cost + baseChargeCost;

    const unit = ENERGY_META[meter.type].unit;

    let consumptionKwh: number | undefined;
    if (meter.type === 'gas') {
      consumptionKwh =
        meterStats.consumption *
        (meter.calorificValue ?? 10.55) *
        (meter.zNumber ?? 0.9672);
    }

    return {
      consumption: meterStats.consumption,
      cost: totalCost,
      unit,
      consumptionKwh,
    };
  }
}