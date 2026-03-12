import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
import { ENERGY_META } from '../../../core/models/energy.models';

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

  form = this.fb.group({
    meterId: ['', Validators.required],
    value: [null as number | null, [Validators.required, Validators.min(0)]],
    date: [new Date(), Validators.required],
    note: [''],
  });

  readonly selectedMeter = computed(() => {
    const id = this.form.get('meterId')?.value;
    return id ? this.energyService.getMeter(id) : null;
  });

  readonly lastReading = computed(() => {
    const meter = this.selectedMeter();
    if (!meter) return null;
    const readings = this.energyService.getReadingsForMeter(meter.id);
    return readings[0] ?? null;
  });

  readonly minValue = computed(() => {
    return this.lastReading()?.value ?? 0;
  });

  readonly consumptionPreview = computed(() => {
    const meter = this.selectedMeter();
    const value = this.form.get('value')?.value;
    const last = this.lastReading();
    if (!meter || value === null || value === undefined) return null;
    const consumption = last ? value - last.value : 0;
    if (consumption < 0) return null;
    let kwh: number | undefined;
    let cost: number;
    if (meter.type === 'gas') {
      kwh = consumption * (meter.calorificValue ?? 10.55) * (meter.zNumber ?? 0.9672);
      cost = kwh * meter.pricePerUnit;
    } else {
      cost = consumption * meter.pricePerUnit;
    }
    return { consumption, kwh, cost };
  });

  ngOnInit(): void {
    const meterId = this.route.snapshot.queryParamMap.get('meterId');
    if (meterId) {
      this.form.patchValue({ meterId });
    } else if (this.activeMeters().length === 1) {
      this.form.patchValue({ meterId: this.activeMeters()[0].id });
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
    if (control?.hasError('required')) return 'Bitte Zählerstand eingeben';
    if (control?.hasError('min')) return `Wert muss mindestens ${this.minValue()} sein`;
    return '';
  }

  save(): void {
    if (this.form.invalid) return;
    const { meterId, value, date, note } = this.form.value;
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
    this.snackBar.open('Ablesung gespeichert', 'OK', { duration: 3000 });
    this.goBack();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
