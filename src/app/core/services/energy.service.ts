import { Injectable, computed, signal, effect } from '@angular/core';
import {
  MeterConfig,
  MeterReading,
  EnergyType,
  ENERGY_META,
  MonthStats,
  YearStats,
  MONTH_NAMES,
  WaterBill,
} from '../models/energy.models';
import { StorageService } from './storage.service';

const METERS_KEY = 'energy_meters';
const READINGS_KEY = 'energy_readings';

@Injectable({ providedIn: 'root' })
export class EnergyService {
  private readonly storage = new StorageService();

  readonly meters = signal<MeterConfig[]>(this.loadMeters());
  readonly readings = signal<MeterReading[]>(this.loadReadings());

  // Aktive Zähler
  readonly activeMeters = computed(() => this.meters().filter((m) => m.active));

  // Lesungen nach Zähler gruppiert
  readonly readingsByMeter = computed(() => {
    const map = new Map<string, MeterReading[]>();
    for (const r of this.readings()) {
      const list = map.get(r.meterId) ?? [];
      list.push(r);
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      map.set(r.meterId, list);
    }
    return map;
  });

  readonly latestReadings = computed(() => {
    const map = new Map<string, MeterReading>();
    for (const [meterId, readings] of this.readingsByMeter()) {
      if (readings.length > 0) map.set(meterId, readings[0]);
    }
    return map;
  });

  readonly totalMonthlyCost = computed(() =>
    this.activeMeters().reduce((sum, m) => sum + m.baseCharge, 0),
  );

  // Dashboard: Verbrauch, Kosten, Trend
  readonly dashboardStats = computed(() => {
    const stats: Record<
      string,
      { consumption: number; cost: number; unit: string; trend: number }
    > = {};
    for (const meter of this.activeMeters()) {
      const readings = this.readingsByMeter().get(meter.id) ?? [];
      const recent = readings.slice(0, 2);
      let consumption = 0,
        cost = 0,
        trend = 0;
      if (recent.length >= 2) {
        consumption = recent[0].value - recent[1].value;
        cost = this.calcCost(meter, consumption);
        if (readings.length >= 4) {
          const prev = readings[2].value - readings[3].value;
          trend = prev > 0 ? ((consumption - prev) / prev) * 100 : 0;
        }
      }
      stats[meter.id] = { consumption, cost, unit: ENERGY_META[meter.type].unit, trend };
    }
    return stats;
  });

  // ============ WASSER-ABRECHNUNG ============
  readonly waterBillStats = computed(() => {
    const result: WaterBill[] = [];
    const waterMeters = this.activeMeters().filter((m) => m.type === 'water');

    for (const mainMeter of waterMeters) {
      const gardenMeters = this.activeMeters().filter(
        (m) => m.type === 'garden_water' && m.linkedWaterMeterId === mainMeter.id,
      );

      const mainReadings = this.readingsByMeter().get(mainMeter.id) ?? [];
      if (mainReadings.length < 2) continue;

      for (let i = 0; i < mainReadings.length - 1; i++) {
        const r = mainReadings[i];
        const prev = mainReadings[i + 1];
        const d = new Date(r.date);
        const consumption = r.value - prev.value;
        if (consumption <= 0) continue;

        let gardenConsumption = 0;
        for (const gm of gardenMeters) {
          const gReadings = this.readingsByMeter().get(gm.id) ?? [];
          for (let j = 0; j < gReadings.length - 1; j++) {
            const gr = gReadings[j];
            const gprev = gReadings[j + 1];
            const gDate = new Date(gr.date);
            if (gDate.getMonth() === d.getMonth() && gDate.getFullYear() === d.getFullYear()) {
              gardenConsumption += gr.value - gprev.value;
            }
          }
        }

        const billableWastewater = Math.max(0, consumption - gardenConsumption);
        const freshwaterCost = consumption * mainMeter.pricePerUnit;
        const wastewaterCost = billableWastewater * (mainMeter.wastewaterPrice ?? 0);

        result.push({
          meterId: mainMeter.id,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          totalConsumption: consumption,
          gardenConsumption,
          billableWastewater,
          freshwaterCost,
          wastewaterCost,
          totalCost: freshwaterCost + wastewaterCost,
        });
      }
    }
    return result;
  });

  // ============ MONATS- / JAHRESSTATISTIKEN ============
  readonly availableYears = computed(() => {
    const years = new Set<number>();
    for (const r of this.readings()) years.add(new Date(r.date).getFullYear());
    return [...years].sort((a, b) => b - a);
  });

  getMonthStats(year: number): MonthStats[] {
    const result: MonthStats[] = [];
    for (let month = 1; month <= 12; month++) {
      const stats: MonthStats = {
        year,
        month,
        label: `${MONTH_NAMES[month - 1]} ${String(year).slice(2)}`,
        byMeter: {},
        totalCost: 0,
      };

      for (const meter of this.activeMeters()) {
        const readings = (this.readingsByMeter().get(meter.id) ?? [])
          .filter((r) => {
            const d = new Date(r.date);
            return d.getFullYear() === year && d.getMonth() + 1 === month;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (readings.length >= 1) {
          const consumption =
            readings[0].consumption ?? readings[0].value - (readings[1]?.value ?? 0);
          const cost = readings[0].cost ?? this.calcCost(meter, consumption);
          stats.byMeter[meter.id] = { consumption, cost, unit: ENERGY_META[meter.type].unit };
          stats.totalCost += cost;
        }
      }
      result.push(stats);
    }
    return result;
  }

  getYearStats(year: number): YearStats {
    const months = this.getMonthStats(year);
    const byMeter: Record<string, { consumption: number; cost: number }> = {};
    let totalCost = 0;

    for (const m of months) {
      for (const [meterId, s] of Object.entries(m.byMeter)) {
        if (!byMeter[meterId]) byMeter[meterId] = { consumption: 0, cost: 0 };
        byMeter[meterId].consumption += s.consumption;
        byMeter[meterId].cost += s.cost;
        totalCost += s.cost;
      }
    }
    return { year, totalCost, byMeter, months };
  }

  // ============ METER CRUD ============
  addMeter(meter: Omit<MeterConfig, 'id' | 'createdAt'>): MeterConfig {
    const newMeter: MeterConfig = { ...meter, id: crypto.randomUUID(), createdAt: new Date() };
    this.meters.update((list) => [...list, newMeter]);
    this.persistMeters();
    return newMeter;
  }

  updateMeter(id: string, changes: Partial<MeterConfig>): void {
    this.meters.update((list) => list.map((m) => (m.id === id ? { ...m, ...changes } : m)));
    this.persistMeters();
  }

  deleteMeter(id: string): void {
    this.meters.update((list) => list.filter((m) => m.id !== id));
    this.readings.update((list) => list.filter((r) => r.meterId !== id));
    this.persistMeters();
    this.persistReadings();
  }

  getMeter(id: string): MeterConfig | undefined {
    return this.meters().find((m) => m.id === id);
  }

  // ============ READING CRUD ============
  addReading(reading: Omit<MeterReading, 'id'>): MeterReading {
    const meter = this.getMeter(reading.meterId);
    if (!meter) throw new Error('Meter not found');

    const allReadings = this.readingsByMeter().get(reading.meterId) ?? [];
    const prev = allReadings[0];
    const consumption = prev ? reading.value - prev.value : 0;

    let kwh: number | undefined;
    let cost = 0;
    let wastewaterCost = 0;

    if (meter.type === 'gas') {
      kwh = consumption * (meter.calorificValue ?? 10.55) * (meter.zNumber ?? 0.9672);
      cost = kwh * meter.pricePerUnit;
    } else if (meter.type === 'water') {
      cost = consumption * meter.pricePerUnit;
      const gardenM3 = this.getGardenWaterConsumptionForPeriod(
        meter.id,
        prev?.date ?? reading.date,
        new Date(reading.date),
      );
      const billableWastewater = Math.max(0, consumption - gardenM3);
      wastewaterCost = billableWastewater * (meter.wastewaterPrice ?? 0);
    } else if (meter.type === 'garden_water') {
      cost = consumption * meter.pricePerUnit;
    } else {
      cost = consumption * meter.pricePerUnit;
    }

    const newReading: MeterReading = {
      ...reading,
      id: crypto.randomUUID(),
      consumption,
      kwh,
      cost,
      wastewaterCost: wastewaterCost > 0 ? wastewaterCost : undefined,
      totalCost: cost + wastewaterCost,
      date: new Date(reading.date),
    };

    this.readings.update((list) => [...list, newReading]);
    this.persistReadings();
    return newReading;
  }

  updateReading(id: string, changes: Partial<MeterReading>): void {
    this.readings.update((list) => list.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    this.persistReadings();
  }

  deleteReading(id: string): void {
    this.readings.update((list) => list.filter((r) => r.id !== id));
    this.persistReadings();
  }

  getReadingsForMeter(meterId: string): MeterReading[] {
    return this.readingsByMeter().get(meterId) ?? [];
  }

  private getGardenWaterConsumptionForPeriod(mainMeterId: string, from: Date, to: Date): number {
    const gardenMeters = this.meters().filter(
      (m) => m.type === 'garden_water' && m.linkedWaterMeterId === mainMeterId,
    );
    let total = 0;
    for (const gm of gardenMeters) {
      const readings = (this.readingsByMeter().get(gm.id) ?? [])
        .filter((r) => r.date >= from && r.date <= to)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      for (let i = 0; i < readings.length - 1; i++) {
        total += readings[i + 1].value - readings[i].value;
      }
    }
    return total;
  }

  private calcCost(meter: MeterConfig, consumption: number): number {
    if (meter.type === 'gas') {
      const kwh = consumption * (meter.calorificValue ?? 10.55) * (meter.zNumber ?? 0.9672);
      return kwh * meter.pricePerUnit;
    }
    return consumption * meter.pricePerUnit;
  }

  // ============ PERSIST ============
  private persistMeters(): void {
    this.storage.set(METERS_KEY, this.meters());
  }
  private persistReadings(): void {
    this.storage.set(READINGS_KEY, this.readings());
  }

  private loadMeters(): MeterConfig[] {
    return this.storage.get<MeterConfig[]>(METERS_KEY) ?? this.createDefaultMeters();
  }

  private loadReadings(): MeterReading[] {
    return (this.storage.get<MeterReading[]>(READINGS_KEY) ?? []).map((r) => ({
      ...r,
      date: new Date(r.date),
    }));
  }

  private createDefaultMeters(): MeterConfig[] {
    return [
      {
        id: crypto.randomUUID(),
        name: 'Haushaltsstrom',
        type: EnergyType.Electricity,
        unit: 'kWh',
        icon: 'bolt',
        color: '#F59E0B',
        active: true,
        createdAt: new Date(),
        pricePerUnit: 0.32,
        baseCharge: 9.5,
        provider: 'Stadtwerke',
      },
      {
        id: crypto.randomUUID(),
        name: 'Erdgas Heizung',
        type: EnergyType.Gas,
        unit: 'm³',
        icon: 'local_fire_department',
        color: '#3B82F6',
        active: true,
        createdAt: new Date(),
        pricePerUnit: 0.12,
        baseCharge: 12.0,
        calorificValue: 10.55,
        zNumber: 0.9672,
      },
      {
        id: crypto.randomUUID(),
        name: 'Trinkwasser',
        type: EnergyType.Water,
        unit: 'm³',
        icon: 'water_drop',
        color: '#06B6D4',
        active: true,
        createdAt: new Date(),
        pricePerUnit: 2.5,
        baseCharge: 5.0,
        wastewaterPrice: 2.8,
      },
    ];
  }

  exportData(): string {
    return JSON.stringify(
      { meters: this.meters(), readings: this.readings(), exportedAt: new Date().toISOString() },
      null,
      2,
    );
  }

  importData(json: string): void {
    const data = JSON.parse(json);
    if (data.meters) this.meters.set(data.meters);
    if (data.readings)
      this.readings.set(data.readings.map((r: MeterReading) => ({ ...r, date: new Date(r.date) })));
    this.persistMeters();
    this.persistReadings();
  }
}
