import { Injectable, inject } from '@angular/core';
import { MeterService } from './meter.service';
import { ReadingService } from './reading.service';
import { SupabaseService } from './supabse.service';

@Injectable({ providedIn: 'root' })
export class DataSyncService {
  private readonly meterService = inject(MeterService);
  private readonly readingService = inject(ReadingService);
  private readonly supabase = inject(SupabaseService);

  exportData(): string {
    return JSON.stringify(
      {
        meters: this.meterService.meters(),
        readings: this.readingService.readings(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  async importData(json: string): Promise<void> {
    const data = JSON.parse(json);
    if (data.meters) {
      for (const m of data.meters) {
        await this.supabase.addMeter(m);
      }
    }
    if (data.readings) {
      for (const r of data.readings) {
        await this.supabase.addReading({ ...r, date: new Date(r.date) });
      }
    }
    // Reload all data after import
    await Promise.all([
        this.meterService.loadMeters(),
        this.readingService.loadReadings()
    ]);
  }
}
