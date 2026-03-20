import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ENERGY_META, MeterReading } from '../../../core/models/energy.models';
import { toSignal } from '@angular/core/rxjs-interop';
import { MeterService } from '../../../core/services/meter.service';
import { ReadingService } from '../../../core/services/reading.service';
import { TariffService } from '../../../core/services/tariff.service';

import { maxDecimalPlaces } from '../../../core/validators/decimal-places.validator';

@Component({
  selector: 'app-readings-form',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  templateUrl: './readings-form.html',
  styleUrl: './readings-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingsForm implements OnInit {
  private readonly meterService = inject(MeterService);
  private readonly readingService = inject(ReadingService);
  private readonly tariffService = inject(TariffService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly activeMeters = this.meterService.activeMeters;

  private readonly readingId = this.route.snapshot.paramMap.get('id');
  readonly isEditMode = !!this.readingId;
  private readonly originalReading = this.isEditMode
    ? this.readingService.getReading(this.readingId!)
    : null;

  form = this.fb.group({
    meterId: ['', Validators.required],
    value: [
      null as number | null,
      [Validators.required, Validators.min(0), maxDecimalPlaces(3)],
    ],
    date: [new Date(), Validators.required],
    note: [''],
  });

  private readonly formSignal = signal(this.form.getRawValue());

  private readonly numericFormValue = computed(() => {
    const rawValue = this.formSignal().value;
    if (rawValue === null || rawValue === undefined) return null;
    const valueStr = String(rawValue).trim();
    if (valueStr === '') return null;
    const numericValue = Number(valueStr.replace(',', '.'));
    return isNaN(numericValue) ? null : numericValue;
  });

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this.formSignal.set(this.form.getRawValue());
    });
  }

  readonly isSaveDisabled = computed(() => {
    const value = this.numericFormValue();
    const max = this.maxValue();
    return (
      this.form.invalid ||
      !this.selectedMeter() ||
      (max !== null && value !== null && value > max)
    );
  });

  readonly selectedMeter = computed(() => {
    const id = this.formSignal().meterId;
    return id ? this.meterService.getMeter(id) : null;
  });

  readonly lastReading = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return null;
    const readings = this.readingService.getReadingsForMeter(meter.id);
    return readings[0] ?? null;
  });

  readonly consumptionPreview = computed(() => {
    const meter = this.selectedMeter();
    const value = this.numericFormValue();
    const date = this.formSignal().date;
    const last = this.lastReading();

    if (!meter || value === null || !date) return null;

    const tariff = this.tariffService.getActiveTariffForDate(meter, date);
    if (!tariff) return { consumption: 0, kwh: 0, cost: 0 };

    const consumption = last ? value - last.value : 0;
    if (consumption < 0) return null;

    let kwh: number | undefined;
    let cost: number;

    if (meter.type === 'gas') {
      const calorificValue =
        tariff.calorificValue ?? meter.calorificValue ?? 10.55;
      const zNumber = tariff.zNumber ?? meter.zNumber ?? 0.9672;
      kwh = consumption * calorificValue * zNumber;
      cost = kwh * tariff.pricePerUnit;
    } else {
      cost = consumption * tariff.pricePerUnit;
    }
    return { consumption, kwh, cost };
  });

  // Findet den zeitlich vorherigen Eintrag basierend auf dem gewählten Datum
  readonly previousReading = computed(() => {
    const meter = this.selectedMeter();
    const selectedDate = this.formSignal().date;
    if (!meter || !selectedDate) return null;

    const readings = this.readingService.getReadingsForMeter(meter.id);
    const selected = new Date(selectedDate).getTime();

    const before = readings
      .filter((r) => {
        // Im Edit-Modus den eigenen Eintrag ausschließen
        if (this.isEditMode && r.id === this.originalReading?.id) return false;
        return new Date(r.date).getTime() < selected;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return before[0] ?? null;
  });

  readonly nextReading = computed(() => {
    const meter = this.selectedMeter();
    const selectedDate = this.formSignal().date;
    if (!meter || !selectedDate) return null;

    const readings = this.readingService.getReadingsForMeter(meter.id);
    const selected = new Date(selectedDate).getTime();

    const after = readings
      .filter((r) => {
        // Im Edit-Modus den eigenen Eintrag ausschließen
        if (this.isEditMode && r.id === this.originalReading?.id) return false;
        return new Date(r.date).getTime() > selected;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return after[0] ?? null;
  });

  readonly minValue = computed(() => {
    return this.previousReading()?.value ?? 0;
  });

  readonly maxValue = computed(() => {
    return this.nextReading()?.value ?? null;
  });

  ngOnInit(): void {
    if (this.isEditMode && this.originalReading) {
      this.form.patchValue(this.originalReading);
      this.formSignal.set(this.form.getRawValue());
      this.form.controls.meterId.disable();
    } else {
      const meterId = this.route.snapshot.queryParamMap.get('meterId');
      if (meterId) {
        this.form.patchValue({ meterId });
        this.formSignal.set(this.form.getRawValue());
      } else if (this.activeMeters().length === 1) {
        this.form.patchValue({ meterId: this.activeMeters()[0].id });
        this.formSignal.set(this.form.getRawValue());
      }
    }
  }

  selectMeter(id: string): void {
    this.form.patchValue({ meterId: id });
  }

  getMeta(type: string) {
    return ENERGY_META[type as keyof typeof ENERGY_META];
  }

  getValueError(): string {
    const control = this.form.get('value');
    const value = this.numericFormValue();
    if (control?.hasError('required')) return 'Bitte Zählerstand eingeben';
    if (control?.hasError('min'))
      return `Wert muss mindestens ${this.minValue()} sein (vorherige Ablesung)`;
    if (this.maxValue() !== null && value !== null && value > this.maxValue()!)
      return `Wert darf maximal ${this.maxValue()} sein (nächste Ablesung)`;
    if (control?.hasError('maxDecimalPlaces'))
      return 'Maximal 3 Nachkommastellen erlaubt';
    return '';
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;

    const rawValue = this.form.getRawValue();
    const numericValue = this.numericFormValue();

    if (numericValue === null) {
      this.snackBar.open('Ungültiger Wert für Zählerstand.', 'OK', {
        duration: 5000,
        panelClass: 'error-snackbar',
      });
      return;
    }

    try {
      if (this.isEditMode && this.originalReading) {
        const changes: Partial<MeterReading> = {
          value: numericValue,
          date: rawValue.date!,
          note: rawValue.note ?? undefined,
        };
        await this.readingService.updateReading(
          this.originalReading.id,
          changes
        );
      } else {
        await this.readingService.addReading({
          meterId: rawValue.meterId!,
          value: numericValue,
          date: rawValue.date!,
          note: rawValue.note ?? undefined,
        });
      }

      this.snackBar.open('Ablesung gespeichert', 'OK', { duration: 3000 });
      this.goBack();
    } catch (error) {
      console.error('Error saving reading:', error);
      this.snackBar.open('Fehler beim Speichern der Ablesung', 'OK', {
        duration: 5000,
        panelClass: 'error-snackbar',
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/readings']);
  }
}
