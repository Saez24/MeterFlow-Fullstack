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
  BudgetAlert,
  TariffPeriod,
} from '../models/energy.models';
import { StorageService } from './storage.service';
import { SupabaseService } from './supabse.service';

const METERS_KEY = 'energy_meters';
const READINGS_KEY = 'energy_readings';

@Injectable({ providedIn: 'root' })
export class EnergyService {
  private readonly storage = new StorageService();
  private readonly supabase = new SupabaseService();

  // Daten

  // readonly meters = signal<MeterConfig[]>(this.loadMeters());
  // readonly readings = signal<MeterReading[]>(this.loadReadings());

  readonly meters = signal<MeterConfig[]>([]);
  readonly readings = signal<MeterReading[]>([]);
  readonly loading = signal(true);

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

  readonly totalYearlyCost = computed(() =>
    this.activeMeters().reduce((sum, m) => {
      const tariff = this.getActiveTariffForDate(m, new Date());
      return sum + (tariff ? tariff.baseCharge * 12 : 0);
    }, 0),
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
        cost = this.calcCost(meter, consumption, recent[0].date);
        if (readings.length >= 4) {
          const prev = readings[2].value - readings[3].value;
          trend = prev > 0 ? ((consumption - prev) / prev) * 100 : 0;
        }
      }
      stats[meter.id] = { consumption, cost, unit: ENERGY_META[meter.type].unit, trend };
    }
    return stats;
  });

  // ============ BUDGET ALERTS ============
  readonly budgetAlerts = computed((): BudgetAlert[] => {
    const alerts: BudgetAlert[] = [];
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();

    for (const meter of this.activeMeters()) {
      if (!meter.budget) continue;
      const { budget } = meter;
      const monthStats = this.getMonthStats(thisYear).find((m) => m.month === thisMonth);
      const yearStats = this.getYearStats(thisYear);
      const ms = monthStats?.byMeter[meter.id];
      const ys = yearStats.byMeter[meter.id];

      if (budget.monthlyLimit && ms) {
        const pct = (ms.cost / budget.monthlyLimit) * 100;
        if (pct >= budget.alertAt) {
          alerts.push({
            meterId: meter.id,
            meterName: meter.name,
            type: 'monthly_cost',
            current: ms.cost,
            limit: budget.monthlyLimit,
            percent: pct,
            unit: '€',
            color: meter.color,
            critical: pct >= 100,
          });
        }
      }
      if (budget.yearlyLimit && ys) {
        const pct = (ys.cost / budget.yearlyLimit) * 100;
        if (pct >= budget.alertAt) {
          alerts.push({
            meterId: meter.id,
            meterName: meter.name,
            type: 'yearly_cost',
            current: ys.cost,
            limit: budget.yearlyLimit,
            percent: pct,
            unit: '€',
            color: meter.color,
            critical: pct >= 100,
          });
        }
      }
      if (budget.consumptionLimit && ms) {
        const pct = (ms.consumption / budget.consumptionLimit) * 100;
        if (pct >= budget.alertAt) {
          alerts.push({
            meterId: meter.id,
            meterName: meter.name,
            type: 'consumption',
            current: ms.consumption,
            limit: budget.consumptionLimit,
            percent: pct,
            unit: ENERGY_META[meter.type].unit,
            color: meter.color,
            critical: pct >= 100,
          });
        }
      }
    }
    return alerts.sort((a, b) => b.percent - a.percent);
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

        const tariff = this.getActiveTariffForDate(mainMeter, r.date);
        const billableWastewater = Math.max(0, consumption - gardenConsumption);
        const freshwaterCost = consumption * (tariff ? tariff.pricePerUnit : 0);
        const wastewaterCost = billableWastewater * (tariff ? tariff.wastewaterPrice ?? 0 : 0);

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

  constructor() {
    effect(() => {
      if (this.supabase.currentUser()) {
        this.loadAll();
      } else {
        this.meters.set([]);
        this.readings.set([]);
        this.loading.set(false);
      }
    });
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);
    const [meters, readings] = await Promise.all([
      this.supabase.getMeters(),
      this.supabase.getReadings(),
    ]);
    this.meters.set(meters);
    this.readings.set(readings);
    this.loading.set(false);
  }

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
          const cost = readings[0].cost ?? this.calcCost(meter, consumption, readings[0].date);
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

    // Grundgebühren: 12 Monate × monatliche Grundgebühr
    totalCost += this.totalYearlyCost();

    return { year, totalCost, byMeter, months };
  }

  async recalculateAllReadingsForMeter(meterId: string): Promise<void> {
    const meter = this.getMeter(meterId);
    if (!meter) return;

    // Chronologisch sortiert — älteste zuerst
    const readings = (this.readingsByMeter().get(meterId) ?? [])
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (readings.length === 0) return;

    for (let i = 0; i < readings.length; i++) {
      const current = readings[i];
      const prev = i > 0 ? readings[i - 1] : null;

      const consumption = prev ? current.value - prev.value : 0;
      let kwh: number | undefined;
      let cost = 0;
      let wastewaterCost: number | undefined;

      const tariff = this.getActiveTariffForDate(meter, current.date);
      if (tariff) {
        if (meter.type === 'gas') {
          const calorificValue = tariff.calorificValue ?? meter.calorificValue ?? 10.55;
          const zNumber = tariff.zNumber ?? meter.zNumber ?? 0.9672;
          kwh = consumption * calorificValue * zNumber;
          cost = kwh * tariff.pricePerUnit;
        } else if (meter.type === 'water') {
          cost = consumption * tariff.pricePerUnit;
          const gardenM3 = prev
            ? this.getGardenWaterConsumptionForPeriod(meterId, prev.date, current.date)
            : 0;
          const wc = Math.max(0, consumption - gardenM3) * (tariff.wastewaterPrice ?? 0);
          wastewaterCost = wc > 0 ? wc : undefined;
        } else {
          cost = consumption * tariff.pricePerUnit;
        }
      }

      const totalCost = cost + (wastewaterCost ?? 0);

      // Nur updaten wenn sich etwas geändert hat
      const changed =
        current.consumption !== consumption ||
        current.cost !== cost ||
        current.kwh !== kwh ||
        current.totalCost !== totalCost;

      if (changed) {
        await this.updateReading({
          ...current,
          consumption,
          kwh,
          cost,
          totalCost,
          wastewaterCost,
        });
      }
    }
  }

  // ============ TARIFF HISTORY ============
  getTariff(meterId: string, tariffId: string): TariffPeriod | null {
    const meter = this.getMeter(meterId);
    if (!meter || !meter.tariffHistory) return null;
    return meter.tariffHistory.find((t) => t.id === tariffId) ?? null;
  }

  getActiveTariff(meter: MeterConfig): TariffPeriod | null {
    return this.getActiveTariffForDate(meter, new Date());
  }

  async addTariff(meterId: string, period: Omit<TariffPeriod, 'id'>): Promise<void> {
    const meter = this.getMeter(meterId);
    if (!meter) return;

    const newValidFrom = new Date(period.validFrom);
    let history = [...(meter.tariffHistory ?? [])];

    // Finde den aktuellsten Tarif, der vor dem neuen Tarif liegt
    const sortedHistory = history.sort(
      (a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
    );

    const previousTariff = sortedHistory.find(
      (p) => new Date(p.validFrom) < newValidFrom && !p.validTo,
    );

    if (previousTariff) {
      const validTo = new Date(newValidFrom);
      validTo.setDate(validTo.getDate() - 1);
      const updatedPreviousTariff = { ...previousTariff, validTo };

      // Ersetze den alten Tarif durch den aktualisierten im Array
      history = history.map((p) => (p.id === previousTariff.id ? updatedPreviousTariff : p));
    }

    const newPeriod: TariffPeriod = {
      ...period,
      id: crypto.randomUUID(),
      validFrom: newValidFrom,
    };

    await this.updateMeter(meterId, {
      tariffHistory: [...history, newPeriod],
    });

    // Neuberechnung nach Tarifänderung
    await this.recalculateAllReadingsForMeter(meterId);
  }

  async updateTariff(meterId: string, tariffId: string, changes: Partial<TariffPeriod>): Promise<void> {
    const meter = this.getMeter(meterId);
    if (!meter || !meter.tariffHistory) return;

    const history = meter.tariffHistory.map((t) => (t.id === tariffId ? { ...t, ...changes } : t));

    await this.updateMeter(meterId, { tariffHistory: history });
    await this.recalculateAllReadingsForMeter(meterId);
  }

  async deleteTariffPeriod(meterId: string, periodId: string): Promise<void> {
    const meter = this.getMeter(meterId);
    if (!meter) return;
    await this.updateMeter(meterId, {
      tariffHistory: (meter.tariffHistory ?? []).filter((p) => p.id !== periodId),
    });
  }

  getActiveTariffForDate(meter: MeterConfig, date: Date): TariffPeriod | null {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const history = (meter.tariffHistory ?? [])
      .filter((p) => {
        const validFrom = new Date(p.validFrom);
        validFrom.setHours(0, 0, 0, 0);
        if (validFrom > d) return false;
        if (p.validTo) {
          const validTo = new Date(p.validTo);
          validTo.setHours(0, 0, 0, 0);
          if (validTo < d) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());

    return history.length > 0 ? history[0] : null;
  }

  // ============ METER CRUD ============
  async addMeter(meter: Omit<MeterConfig, 'id' | 'createdAt'>): Promise<MeterConfig> {
    const saved = await this.supabase.addMeter(meter);
    this.meters.update(list => [...list, saved]);
    return saved;
  }

  async updateMeter(id: string, changes: Partial<MeterConfig>): Promise<void> {
    await this.supabase.updateMeter(id, changes);
    this.meters.update(list => list.map(m => m.id === id ? { ...m, ...changes } : m));
  }

  async deleteMeter(id: string): Promise<void> {
    await this.supabase.deleteMeter(id);
    this.meters.update(list => list.filter(m => m.id !== id));
    this.readings.update(list => list.filter(r => r.meterId !== id));
  }

  getMeter(id: string): MeterConfig | undefined {
    return this.meters().find((m) => m.id === id);
  }

  getReading(id: string): MeterReading | undefined {
    return this.readings().find((r) => r.id === id);
  }

  // ============ READING CRUD ============
  async addReading(reading: Omit<MeterReading, 'id'>): Promise<MeterReading> {
    const meter = this.getMeter(reading.meterId);
    if (!meter) throw new Error('Meter not found');

    // Berechnungslogik bleibt identisch ...
    const allReadings = this.readingsByMeter().get(reading.meterId) ?? [];
    const prev = allReadings[0];
    const consumption = prev ? reading.value - prev.value : 0;
    let kwh: number | undefined, cost = 0, wastewaterCost = 0;

    const tariff = this.getActiveTariffForDate(meter, new Date(reading.date));
    if (tariff) {
      if (meter.type === 'gas') {
        const calorificValue = tariff.calorificValue ?? meter.calorificValue ?? 10.55;
        const zNumber = tariff.zNumber ?? meter.zNumber ?? 0.9672;
        kwh = consumption * calorificValue * zNumber;
        cost = kwh * tariff.pricePerUnit;
      } else if (meter.type === 'water') {
        cost = consumption * tariff.pricePerUnit;
        const gardenM3 = this.getGardenWaterConsumptionForPeriod(
          meter.id,
          prev?.date ?? reading.date,
          new Date(reading.date),
        );
        wastewaterCost = Math.max(0, consumption - gardenM3) * (tariff.wastewaterPrice ?? 0);
      } else {
        cost = consumption * tariff.pricePerUnit;
      }
    }

    const payload: Omit<MeterReading, 'id'> = {
      ...reading,
      consumption, kwh, cost,
      wastewaterCost: wastewaterCost > 0 ? wastewaterCost : undefined,
      totalCost: cost + wastewaterCost,
      date: new Date(reading.date),
    };

    const saved = await this.supabase.addReading(payload);
    this.readings.update(list => [...list, saved]);
    await this.recalculateAllReadingsForMeter(reading.meterId);
    return saved;
  }

  async updateReading(reading: MeterReading): Promise<void> {
    const { id, ...changes } = reading;
    await this.supabase.updateReading(id, changes);
    this.readings.update((list) =>
      list.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    );
    await this.recalculateAllReadingsForMeter(reading.meterId);
  }

  async deleteReading(id: string): Promise<void> {
    const reading = this.getReading(id);
    if (!reading) return;
    await this.supabase.deleteReading(id);
    this.readings.update((list) => list.filter((r) => r.id !== id));
    await this.recalculateAllReadingsForMeter(reading.meterId);
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

  private calcCost(meter: MeterConfig, consumption: number, date: Date): number {
    const tariff = this.getActiveTariffForDate(meter, date);
    if (!tariff) return 0;

    if (meter.type === 'gas') {
      const calorificValue = tariff.calorificValue ?? meter.calorificValue ?? 10.55;
      const zNumber = tariff.zNumber ?? meter.zNumber ?? 0.9672;
      const kwh = consumption * calorificValue * zNumber;
      return kwh * tariff.pricePerUnit;
    }
    return consumption * tariff.pricePerUnit;
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
        tariffHistory: [],
        provider: '',
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

  async importData(json: string): Promise<void> {
    const data = JSON.parse(json);
    if (data.meters) {
      for (const m of data.meters) await this.supabase.addMeter(m);
    }
    if (data.readings) {
      for (const r of data.readings) await this.supabase.addReading({ ...r, date: new Date(r.date) });
    }
    await this.loadAll();
  }

}
