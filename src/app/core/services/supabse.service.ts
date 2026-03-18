import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { MeterConfig, MeterReading } from '../models/energy.models';


@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );
  readonly connectionStatus = signal<'checking' | 'connected' | 'error'>('checking');

  readonly currentUser = signal<User | null>(null);

  constructor() {
    // Session beim Start laden
    this.client.auth.getSession().then(({ data }) => {
      this.currentUser.set(data.session?.user ?? null);
      this.checkConnection();
    });

    // Auth Änderungen beobachten
    this.client.auth.onAuthStateChange((_, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  // ── Auth ──────────────────────────────────────────
  async signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.client.auth.signOut();
  }

  async getSession() {
    const { data } = await this.client.auth.getSession();
    return data.session?.user ?? null;
  }

  // ── Zähler ────────────────────────────────────────
  async getMeters(): Promise<MeterConfig[]> {
    const { data, error } = await this.client
      .from('meters')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(this.mapMeter);
  }

  async addMeter(meter: Omit<MeterConfig, 'id' | 'createdAt'>): Promise<MeterConfig> {
    const { data, error } = await this.client
      .from('meters')
      .insert(this.toDbMeter(meter))
      .select()
      .single();
    if (error) throw error;
    return this.mapMeter(data);
  }

  async updateMeter(id: string, changes: Partial<MeterConfig>): Promise<void> {
    const { error } = await this.client
      .from('meters')
      .update(this.toDbMeter(changes))
      .eq('id', id);
    if (error) throw error;
  }

  async deleteMeter(id: string): Promise<void> {
    const { error } = await this.client.from('meters').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Ablesungen ────────────────────────────────────
  async getReadings(): Promise<MeterReading[]> {
    const { data, error } = await this.client
      .from('readings')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(this.mapReading);
  }

  async addReading(reading: Omit<MeterReading, 'id'>): Promise<MeterReading> {
    const { data, error } = await this.client
      .from('readings')
      .insert(this.toDbReading(reading))
      .select()
      .single();
    if (error) throw error;
    return this.mapReading(data);
  }

  async updateReading(id: string, changes: Partial<MeterReading>): Promise<void> {
    const { error } = await this.client
      .from('readings')
      .update(this.toDbReading(changes))
      .eq('id', id);
    if (error) throw error;
  }

  async deleteReading(id: string): Promise<void> {
    const { error } = await this.client.from('readings').delete().eq('id', id);
    if (error) throw error;
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
    calorificValue: d.calorific_value,
    zNumber: d.z_number,
    meterNumber: d.meter_number,
    provider: d.provider,
    notes: d.notes,
    tariffHistory: d.tariff_history ?? [],
    budget: d.budget,
  });

  private mapReading = (d: any): MeterReading => ({
    id: d.id,
    meterId: d.meter_id,
    value: d.value,
    date: new Date(d.date),
    consumption: d.consumption,
    kwh: d.kwh,
    cost: d.cost,
    wastewaterCost: d.wastewater_cost,
    totalCost: d.total_cost,
    note: d.note,
    photo: d.photo,
  });

  // ── Mapper: App → DB ──────────────────────────────
  private toDbMeter = (m: Partial<MeterConfig>) => ({
    user_id: this.currentUser()?.id,
    ...(m.name !== undefined && { name: m.name }),
    ...(m.type !== undefined && { type: m.type }),
    ...(m.unit !== undefined && { unit: m.unit }),
    ...(m.icon !== undefined && { icon: m.icon }),
    ...(m.color !== undefined && { color: m.color }),
    ...(m.active !== undefined && { active: m.active }),
    ...(m.linkedWaterMeterId !== undefined && { linked_water_meter_id: m.linkedWaterMeterId }),
    ...(m.calorificValue !== undefined && { calorific_value: m.calorificValue }),
    ...(m.zNumber !== undefined && { z_number: m.zNumber }),
    ...(m.meterNumber !== undefined && { meter_number: m.meterNumber }),
    ...(m.provider !== undefined && { provider: m.provider }),
    ...(m.notes !== undefined && { notes: m.notes }),
    ...(m.tariffHistory !== undefined && { tariff_history: m.tariffHistory }),
    ...(m.budget !== undefined && { budget: m.budget }),
  });

  private toDbReading = (r: Partial<MeterReading>) => ({
    user_id: this.currentUser()?.id,
    ...(r.meterId !== undefined && { meter_id: r.meterId }),
    ...(r.value !== undefined && { value: r.value }),
    ...(r.date !== undefined && { date: r.date }),
    ...(r.consumption !== undefined && { consumption: r.consumption }),
    ...(r.kwh !== undefined && { kwh: r.kwh }),
    ...(r.cost !== undefined && { cost: r.cost }),
    ...(r.wastewaterCost !== undefined && { wastewater_cost: r.wastewaterCost }),
    ...(r.totalCost !== undefined && { total_cost: r.totalCost }),
    ...(r.note !== undefined && { note: r.note }),
    ...(r.photo !== undefined && { photo: r.photo }),
  });

  async checkConnection(): Promise<void> {
    this.connectionStatus.set('checking');
    try {
      const { error } = await this.client.from('meters').select('id').limit(1);
      this.connectionStatus.set(error ? 'error' : 'connected');
    } catch {
      this.connectionStatus.set('error');
    }
  }
}