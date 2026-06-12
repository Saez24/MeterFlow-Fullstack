import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeterService } from './meter.service';
import { ReadingService } from './reading.service';

@Injectable({ providedIn: 'root' })
export class DataSyncService {
  private readonly http = inject(HttpClient);
  private readonly meterService = inject(MeterService);
  private readonly readingService = inject(ReadingService);
  private readonly base = environment.apiUrl;

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
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Ungültiges JSON-Format');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Ungültige Datenstruktur');
    }

    const result = await firstValueFrom(
      this.http.post<{
        meters_added: number;
        meters_skipped: number;
        readings_added: number;
        readings_skipped: number;
      }>(`${this.base}/import/`, parsed)
    );

    await Promise.all([
      this.meterService.loadMeters(),
      this.readingService.loadReadings(),
    ]);
  }
}
