import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeterConfig, MeterReading } from '../models/energy.models';

export interface AppUser {
  id: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  readonly connectionStatus = signal<'checking' | 'connected' | 'error'>('checking');
  readonly currentUser = signal<AppUser | null>(null);

  readonly sessionReady: Promise<void>;
  private _resolveReady!: () => void;

  constructor() {
    this.sessionReady = new Promise(resolve => (this._resolveReady = resolve));
    this.initSession();
  }

  private async initSession(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<AppUser>(`${this.base}/auth/me`)
      );
      this.currentUser.set(user);
      this.connectionStatus.set('connected');
    } catch (err: any) {
      if (err?.status === 401) {
        try {
          await fetch(`${this.base}/auth/refresh`, { method: 'POST', credentials: 'include' });
          const user = await firstValueFrom(
            this.http.get<AppUser>(`${this.base}/auth/me`)
          );
          this.currentUser.set(user);
          this.connectionStatus.set('connected');
        } catch {
          this.currentUser.set(null);
          this.connectionStatus.set('error');
        }
      } else {
        this.connectionStatus.set('error');
      }
    } finally {
      this._resolveReady();
    }
  }

  // ── Auth ──────────────────────────────────────────

  async signUp(email: string, password: string): Promise<{ error: { message: string } | null }> {
    try {
      const user = await firstValueFrom(
        this.http.post<AppUser>(`${this.base}/auth/register`, { email, password })
      );
      this.currentUser.set(user);
      this.connectionStatus.set('connected');
      return { error: null };
    } catch (err: any) {
      const msg = err?.error?.detail ?? 'Registrierung fehlgeschlagen';
      return { error: { message: Array.isArray(msg) ? (msg[0]?.msg ?? String(msg)) : String(msg) } };
    }
  }

  async signIn(email: string, password: string): Promise<{ error: { message: string } | null }> {
    try {
      const user = await firstValueFrom(
        this.http.post<AppUser>(`${this.base}/auth/login`, { email, password })
      );
      this.currentUser.set(user);
      this.connectionStatus.set('connected');
      return { error: null };
    } catch (err: any) {
      const msg = err?.error?.detail ?? 'Login fehlgeschlagen';
      return { error: { message: Array.isArray(msg) ? (msg[0]?.msg ?? String(msg)) : String(msg) } };
    }
  }

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.base}/auth/logout`, {}));
    } finally {
      this.currentUser.set(null);
    }
  }

  // ── Zähler ────────────────────────────────────────

  async getMeters(): Promise<MeterConfig[]> {
    const data = await firstValueFrom(this.http.get<any[]>(`${this.base}/meters/`));
    return (data ?? []).map(this.mapMeter);
  }

  async addMeter(meter: Omit<MeterConfig, 'id' | 'createdAt'>): Promise<MeterConfig> {
    const data = await firstValueFrom(
      this.http.post<any>(`${this.base}/meters/`, this.toDbMeter(meter))
    );
    return this.mapMeter(data);
  }

  async updateMeter(id: string, changes: Partial<MeterConfig>): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${this.base}/meters/${id}`, this.toDbMeter(changes))
    );
  }

  async deleteMeter(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/meters/${id}`));
  }

  // ── Ablesungen ────────────────────────────────────

  async getReadings(): Promise<MeterReading[]> {
    const data = await firstValueFrom(this.http.get<any[]>(`${this.base}/readings/`));
    return (data ?? []).map(this.mapReading);
  }

  async addReading(reading: Omit<MeterReading, 'id'>): Promise<MeterReading> {
    const date = reading.date instanceof Date
      ? reading.date.toISOString().split('T')[0]
      : String(reading.date);
    const body = {
      meter_id: reading.meterId,
      date,
      value: reading.value,
      note: reading.note ?? null,
    };
    const data = await firstValueFrom(this.http.post<any>(`${this.base}/readings/`, body));
    return this.mapReading(data);
  }

  async updateReading(id: string, changes: Partial<MeterReading>): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${this.base}/readings/${id}`, this.toDbReading(changes))
    );
  }

  async deleteReading(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/readings/${id}`));
  }

  async recalculateReadings(meterId: string): Promise<MeterReading[]> {
    const data = await firstValueFrom(
      this.http.post<any[]>(`${this.base}/readings/recalculate/${meterId}`, {})
    );
    return (data ?? []).map(this.mapReading);
  }

  // ── Fotos (Storage) ───────────────────────────────

  async uploadPhoto(file: File, readingId?: string): Promise<string> {
    if (!readingId) throw new Error('readingId required for photo upload');
    const formData = new FormData();
    formData.append('file', file);
    const data = await firstValueFrom(
      this.http.post<{ key: string }>(`${this.base}/readings/${readingId}/photo`, formData)
    );
    return data.key;
  }

  async getSignedPhotoUrl(path: string): Promise<string> {
    return path;
  }

  async deletePhoto(_path: string): Promise<void> {
    // handled server-side when reading is deleted
  }

  // ── CO₂-Faktoren ──────────────────────────────────

  async getCo2Factors(): Promise<{ data: any[] | null; error: any }> {
    try {
      const data = await firstValueFrom(
        this.http.get<any[]>(`${this.base}/co2-factors/`)
      );
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }

  async upsertCo2Factor(row: {
    energy_type: string;
    factor_kg_per_unit: number;
    unit: string;
    source: string;
    source_url: string | null;
    valid_from: string;
  }): Promise<void> {
    await firstValueFrom(this.http.put(`${this.base}/co2-factors/`, row));
  }

  async deleteCo2Factor(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/co2-factors/${id}`));
  }

  // ── Verbindungscheck ──────────────────────────────

  async checkConnection(): Promise<void> {
    this.connectionStatus.set('checking');
    try {
      await firstValueFrom(this.http.get('/health'));
      this.connectionStatus.set('connected');
    } catch {
      this.connectionStatus.set('error');
    }
  }

  // ── Mapper: DB → App ──────────────────────────────

  private mapMeter = (d: any): MeterConfig => ({
    id: d.id,
    name: d.name,
    type: d.type,
    unit: d.unit,
    icon: d.icon,
    color: d.color,
    active: d.active,
    createdAt: new Date(d.created_at),
    linkedWaterMeterId: d.linked_water_meter_id,
    calorificValue: d.calorific_value != null ? Number(d.calorific_value) : undefined,
    zNumber: d.z_number != null ? Number(d.z_number) : undefined,
    connectedLoadKw: d.connected_load_kw != null ? Number(d.connected_load_kw) : undefined,
    meterNumber: d.meter_number,
    provider: d.provider,
    notes: d.notes,
    tariffHistory: d.tariff_history ?? [],
    budget: d.budget,
  });

  private mapReading = (d: any): MeterReading => ({
    id: d.id,
    meterId: d.meter_id,
    value: Number(d.value),
    date: new Date(d.date),
    consumption: d.consumption != null ? Number(d.consumption) : undefined,
    kwh: d.kwh != null ? Number(d.kwh) : undefined,
    cost: d.cost != null ? Number(d.cost) : undefined,
    wastewaterCost: d.wastewater_cost != null ? Number(d.wastewater_cost) : undefined,
    totalCost: d.total_cost != null ? Number(d.total_cost) : undefined,
    note: d.note,
    photo: d.photo,
  });

  // ── Mapper: App → DB ──────────────────────────────

  private toDbMeter = (m: Partial<MeterConfig>) => ({
    ...(m.name !== undefined && { name: m.name }),
    ...(m.type !== undefined && { type: m.type }),
    ...(m.unit !== undefined && { unit: m.unit }),
    ...(m.icon !== undefined && { icon: m.icon }),
    ...(m.color !== undefined && { color: m.color }),
    ...(m.active !== undefined && { active: m.active }),
    ...(m.linkedWaterMeterId !== undefined && { linked_water_meter_id: m.linkedWaterMeterId }),
    ...(m.calorificValue !== undefined && { calorific_value: m.calorificValue }),
    ...(m.zNumber !== undefined && { z_number: m.zNumber }),
    ...(m.connectedLoadKw !== undefined && { connected_load_kw: m.connectedLoadKw }),
    ...(m.meterNumber !== undefined && { meter_number: m.meterNumber }),
    ...(m.provider !== undefined && { provider: m.provider }),
    ...(m.notes !== undefined && { notes: m.notes }),
    ...(m.tariffHistory !== undefined && { tariff_history: m.tariffHistory }),
    ...(m.budget !== undefined && { budget: m.budget }),
  });

  private toDbReading = (r: Partial<MeterReading>) => ({
    ...(r.meterId !== undefined && { meter_id: r.meterId }),
    ...(r.value !== undefined && { value: r.value }),
    ...(r.date !== undefined && {
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    }),
    ...(r.consumption !== undefined && { consumption: r.consumption }),
    ...(r.kwh !== undefined && { kwh: r.kwh }),
    ...(r.cost !== undefined && { cost: r.cost }),
    ...(r.wastewaterCost !== undefined && { wastewater_cost: r.wastewaterCost }),
    ...(r.totalCost !== undefined && { total_cost: r.totalCost }),
    ...(r.note !== undefined && { note: r.note }),
    ...(r.photo !== undefined && { photo: r.photo }),
  });
}
