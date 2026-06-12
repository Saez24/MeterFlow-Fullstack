import { Injectable, signal, computed, inject } from '@angular/core';
import { MeterReading, MeterConfig } from '../models/energy.models';
import { SupabaseService } from './supabase.service';
import { MeterService } from './meter.service';
import { TariffService } from './tariff.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private readonly supabase = inject(SupabaseService);
  private readonly meterService = inject(MeterService);
  private readonly tariffService = inject(TariffService);
  private readonly router = inject(Router);

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
    const saved = await this.supabase.addReading(reading);
    this.readings.update(list => [...list, saved]);
    await this.recalculateAllReadingsForMeter(reading.meterId);
    return saved;
  }

  async updateReading(id: string, changes: Partial<MeterReading>): Promise<void> {
    await this.supabase.updateReading(id, changes);
    const oldReading = this.getReading(id);
    this.readings.update(list =>
      list.map(r => (r.id === id ? { ...r, ...changes } : r))
    );
    if (oldReading) await this.recalculateAllReadingsForMeter(oldReading.meterId);
    this.goBack();
  }

  async deleteReading(id: string): Promise<void> {
    const reading = this.getReading(id);
    if (!reading) return;
    await this.supabase.deleteReading(id);
    this.readings.update(list => list.filter(r => r.id !== id));
    await this.recalculateAllReadingsForMeter(reading.meterId);
    this.goBack();
  }

  async deleteReadingsForMeter(meterId: string): Promise<void> {
    this.readings.update(list => list.filter(r => r.meterId !== meterId));
  }

  async recalculateAllReadingsForMeter(meterId: string): Promise<void> {
    const updated = await this.supabase.recalculateReadings(meterId);
    this.readings.update(list => [
      ...list.filter(r => r.meterId !== meterId),
      ...updated,
    ]);
  }

  getGardenWaterCost(reading: any): number | null {
    const meter = this.getMeter(reading.meterId);
    if (!meter || meter.type !== 'garden_water') return null;
    if (!reading.consumption || reading.consumption <= 0) return null;

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

  goBack(): void {
    this.router.navigate(['/readings']);
  }
}
