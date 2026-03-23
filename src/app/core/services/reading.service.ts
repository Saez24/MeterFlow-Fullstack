import { Injectable, signal, computed, inject } from '@angular/core';
import { MeterReading, MeterConfig } from '../models/energy.models';
import { SupabaseService } from './supabse.service';
import { MeterService } from './meter.service';
import { TariffService } from './tariff.service';

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private readonly supabase = inject(SupabaseService);
  private readonly meterService = inject(MeterService);
  private readonly tariffService = inject(TariffService);

  readonly readings = signal<MeterReading[]>([]);
  readonly loading = signal(true);

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

  constructor() {
    this.loadReadings();
  }

  async loadReadings(): Promise<void> {
    this.loading.set(true);
    const readings = await this.supabase.getReadings();
    this.readings.set(readings);
    this.loading.set(false);
  }

  getReading(id: string): MeterReading | undefined {
    return this.readings().find((r) => r.id === id);
  }

  getReadingsForMeter(meterId: string): MeterReading[] {
    return this.readingsByMeter().get(meterId) ?? [];
  }

  async addReading(reading: Omit<MeterReading, 'id'>): Promise<MeterReading> {
    const meter = this.meterService.getMeter(reading.meterId);
    if (!meter) throw new Error('Meter not found');

    const allReadings = this.readingsByMeter().get(reading.meterId) ?? [];
    const prev = allReadings[0];
    const consumption = prev ? reading.value - prev.value : 0;
    let kwh: number | undefined, cost = 0, wastewaterCost = 0;

    const tariff = this.tariffService.getActiveTariffForDate(meter, new Date(reading.date));
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
          prev?.date ?? new Date(reading.date),
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

  async updateReading(id: string, changes: Partial<MeterReading>): Promise<void> {
    await this.supabase.updateReading(id, changes);

    const oldReading = this.getReading(id);
    if (!oldReading) return;

    this.readings.update((list) =>
      list.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    );
    await this.recalculateAllReadingsForMeter(oldReading.meterId);
  }

  async deleteReading(id: string): Promise<void> {
    const reading = this.getReading(id);
    if (!reading) return;
    await this.supabase.deleteReading(id);
    this.readings.update((list) => list.filter((r) => r.id !== id));
    await this.recalculateAllReadingsForMeter(reading.meterId);
  }

  async deleteReadingsForMeter(meterId: string): Promise<void> {
    this.readings.update((list) => list.filter((r) => r.meterId !== meterId));
  }

  async recalculateAllReadingsForMeter(meterId: string): Promise<void> {
    const meter = this.meterService.getMeter(meterId);
    if (!meter) return;

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

      const tariff = this.tariffService.getActiveTariffForDate(meter, current.date);
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

      const changed =
        current.consumption !== consumption ||
        current.cost !== cost ||
        current.kwh !== kwh ||
        current.totalCost !== totalCost;

      if (changed) {
        const updatedReading = {
          ...current,
          consumption,
          kwh,
          cost,
          totalCost,
          wastewaterCost,
        };
        const { id, ...changes } = updatedReading;
        await this.supabase.updateReading(id, changes);
        this.readings.update((list) =>
          list.map((r) => (r.id === id ? updatedReading : r))
        );
      }
    }
  }

  private getGardenWaterConsumptionForPeriod(mainMeterId: string, from: Date, to: Date): number {
    const gardenMeters = this.meterService.meters().filter(
      (m) => m.type === 'garden_water' && m.linkedWaterMeterId === mainMeterId,
    );
    let total = 0;
    for (const gm of gardenMeters) {
      const readings = (this.readingsByMeter().get(gm.id) ?? [])
        .filter((r) => new Date(r.date) >= from && new Date(r.date) <= to)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (let i = 0; i < readings.length - 1; i++) {
        total += readings[i + 1].value - readings[i].value;
      }
    }
    return total;
  }

  getGardenWaterCost(reading: any): number | null {
    const meter = this.getMeter(reading.meterId);
    if (!meter || meter.type !== 'garden_water') return null;
    if (!reading.consumption || reading.consumption <= 0) return null;

    // Verlinkten Wasserzähler finden
    const linkedMeter = meter.linkedWaterMeterId
      ? this.meterService.getMeter(meter.linkedWaterMeterId)
      : null;
    const tariffMeter = linkedMeter ?? meter;

    const tariff = this.tariffService.getActiveTariffForDate(tariffMeter, new Date(reading.date));
    if (!tariff?.wastewaterPrice) return null;

    return reading.consumption * tariff.wastewaterPrice;
  }

  getMeter(id: string): MeterConfig | undefined {
    return this.meterService.getMeter(id);
  }
}
