import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
import { EnergyService } from '../../../core/services/energy.service';
import { ENERGY_META, MeterReading } from '../../../core/models/energy.models';
import { toSignal } from '@angular/core/rxjs-interop';

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
})
export class ReadingsForm implements OnInit {
  private readonly energyService = inject(EnergyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly activeMeters = this.energyService.activeMeters;
  
  private readonly readingId = this.route.snapshot.paramMap.get('id');
  readonly isEditMode = !!this.readingId;
  private readonly originalReading = this.isEditMode ? this.energyService.getReading(this.readingId!) : null;

  readonly isSaveDisabled = computed(() => {
    const value = this.formValue().value;
    const max = this.maxValue();
    return (
      this.form.invalid ||
      !this.selectedMeter() ||
      (max !== null && value !== null && value !== undefined && value > max)
    );
  });

  form = this.fb.group({
    meterId: ['', Validators.required],
    value: [null as number | null, [Validators.required, Validators.min(0)]],
    date: [new Date(), Validators.required],
    note: [''],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.value,
  });

  readonly selectedMeter = computed(() => {
    const id = this.formValue().meterId;
    return id ? this.energyService.getMeter(id) : null;
  });

  readonly lastReading = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return null;
    const readings = this.energyService.getReadingsForMeter(meter.id);
    return readings[0] ?? null;
  });

  readonly consumptionPreview = computed(() => {
    const meter = this.selectedMeter();
    const formVal = this.formValue();
    const value = formVal.value;
    const date = formVal.date;
    const last = this.lastReading();

    if (!meter || value === null || value === undefined || !date) return null;

    const tariff = this.energyService.getActiveTariffForDate(meter, date);
    if (!tariff) return { consumption: 0, kwh: 0, cost: 0 };

    const consumption = last ? value - last.value : 0;
    if (consumption < 0) return null;

    let kwh: number | undefined;
    let cost: number;

    if (meter.type === 'gas') {
      const calorificValue = tariff.calorificValue ?? meter.calorificValue ?? 10.55;
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
    const selectedDate = this.formValue().date;
    if (!meter || !selectedDate) return null;

    const readings = this.energyService.getReadingsForMeter(meter.id);
    const selected = new Date(selectedDate).getTime();

    // Alle Ablesungen die vor dem gewählten Datum liegen, neueste zuerst
    const before = readings
      .filter((r) => new Date(r.date).getTime() < selected)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return before[0] ?? null;
  });

  // Findet den zeitlich nächsten Eintrag nach dem gewählten Datum
  readonly nextReading = computed(() => {
    const meter = this.selectedMeter();
    const selectedDate = this.formValue().date;
    if (!meter || !selectedDate) return null;

    const readings = this.energyService.getReadingsForMeter(meter.id);
    const selected = new Date(selectedDate).getTime();

    // Alle Ablesungen die nach dem gewählten Datum liegen, älteste zuerst
    const after = readings
      .filter((r) => new Date(r.date).getTime() > selected)
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
      this.form.controls.meterId.disable();
    } else {
      const meterId = this.route.snapshot.queryParamMap.get('meterId');
      if (meterId) {
        this.form.patchValue({ meterId });
      } else if (this.activeMeters().length === 1) {
        this.form.patchValue({ meterId: this.activeMeters()[0].id });
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
    const value = control?.value;
    if (control?.hasError('required')) return 'Bitte Zählerstand eingeben';
    if (control?.hasError('min'))
      return `Wert muss mindestens ${this.minValue()} sein (vorherige Ablesung)`;
    if (this.maxValue() !== null && value !== null && value! > this.maxValue()!)
      return `Wert darf maximal ${this.maxValue()} sein (nächste Ablesung)`;
    return '';
  }

  save(): void {
    if (this.form.invalid) return;

    if (this.isEditMode && this.originalReading) {
      const updatedReading: MeterReading = {
        ...this.originalReading,
        value: this.form.value.value!,
        date: this.form.value.date!,
        note: this.form.value.note ?? undefined,
      };
      this.energyService.updateReading(updatedReading);
    } else {
      const { meterId, value, date, note } = this.form.getRawValue();
      const preview = this.consumptionPreview();
  
      this.energyService.addReading({
        meterId: meterId!,
        value: value!,
        date: date!,
        note: note ?? undefined,
        consumption: preview?.consumption ?? 0,
        cost: preview?.cost ?? 0,
        totalCost: preview?.cost ?? 0,
      });
    }

    this.snackBar.open('Ablesung gespeichert', 'OK', { duration: 3000 });
    this.goBack();
  }

  goBack(): void {
    this.router.navigate([this.isEditMode ? '/readings' : '/']);
  }
}
