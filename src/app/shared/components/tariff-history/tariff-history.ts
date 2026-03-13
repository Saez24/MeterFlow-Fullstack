import { Component, inject, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnergyService } from '../../../core/services/energy.service';
import { MeterConfig, TariffPeriod } from '../../../core/models/energy.models';

@Component({
  selector: 'app-tariff-history',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './tariff-history.html',
  styleUrl: './tariff-history.scss',
})
export class TariffHistory {
  private readonly energyService = inject(EnergyService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly meter = input.required<MeterConfig>();

  readonly showForm = signal(false);

  readonly isGas = computed(() => this.meter().type === 'gas');
  readonly isWater = computed(() => ['water', 'garden_water'].includes(this.meter().type));

  readonly sortedHistory = computed(() =>
    [...(this.meter().tariffHistory ?? [])].sort(
      (a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
    ),
  );

  readonly currentTariff = computed(() => {
    const h = this.sortedHistory();
    return h.length > 0 ? h[0] : null;
  });

  form = this.fb.group({
    validFrom: [new Date(), Validators.required],
    pricePerUnit: [null as number | null, [Validators.required, Validators.min(0)]],
    baseCharge: [null as number | null, [Validators.required, Validators.min(0)]],
    wastewaterPrice: [null as number | null],
    calorificValue: [null as number | null],
    zNumber: [null as number | null],
    note: [''],
  });

  // Signal für Formwerte (Zoneless-kompatibel)
  protected readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.value,
  });

  readonly priceDiff = computed(() => {
    const current = this.currentTariff();
    const newPrice = this.formValue().pricePerUnit;
    if (!current || !newPrice || newPrice === 0) return 0;
    return ((newPrice - current.pricePerUnit) / current.pricePerUnit) * 100;
  });

  // Beim Öffnen: aktuelle Werte als Vorschlag eintragen
  ngOnInit(): void {
    const m = this.meter();
    this.form.patchValue({
      pricePerUnit: m.pricePerUnit,
      baseCharge: m.baseCharge,
      wastewaterPrice: m.wastewaterPrice ?? null,
      calorificValue: m.calorificValue ?? null,
      zNumber: m.zNumber ?? null,
    });
  }

  getPriceDiff(index: number): { pct: number; prev: number; curr: number } | null {
    const history = this.sortedHistory();
    const curr = history[index];
    // Vergleich mit dem nächst-älteren Eintrag oder dem Basis-Tarif
    const prev = history[index + 1] ?? null;
    const prevPrice = prev ? prev.pricePerUnit : this.meter().pricePerUnit;
    if (prevPrice === 0) return null;
    const pct = ((curr.pricePerUnit - prevPrice) / prevPrice) * 100;
    return { pct, prev: prevPrice, curr: curr.pricePerUnit };
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.energyService.addTariffPeriod(this.meter().id, {
      validFrom: new Date(v.validFrom!),
      pricePerUnit: v.pricePerUnit!,
      baseCharge: v.baseCharge!,
      wastewaterPrice: v.wastewaterPrice ?? undefined,
      calorificValue: v.calorificValue ?? undefined,
      zNumber: v.zNumber ?? undefined,
      note: v.note || undefined,
    });
    this.snackBar.open('Tarif gespeichert', 'OK', { duration: 3000 });
    this.showForm.set(false);
  }

  delete(period: TariffPeriod): void {
    if (
      confirm(
        `Tarif vom ${new Date(period.validFrom).toLocaleDateString('de-DE')} wirklich löschen?`,
      )
    ) {
      this.energyService.deleteTariffPeriod(this.meter().id, period.id);
      this.snackBar.open('Tarif gelöscht', 'OK', { duration: 3000 });
    }
  }
}
