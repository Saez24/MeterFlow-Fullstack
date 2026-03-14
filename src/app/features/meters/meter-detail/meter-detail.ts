import { Component, inject, computed, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { EnergyService } from '../../../core/services/energy.service';
import { ENERGY_META, MeterConfig } from '../../../core/models/energy.models';
import { TariffHistory } from '../../../shared/components/tariff-history/tariff-history';
import { Chart } from 'chart.js';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-meter-detail',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TariffHistory,
    MatTabsModule,
  ],
  templateUrl: './meter-detail.html',
  styleUrl: './meter-detail.scss',
})
export class MeterDetail {
  private readonly energyService = inject(EnergyService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly themeService = inject(ThemeService);

  @ViewChild('detailChart') detailChartRef!: ElementRef<HTMLCanvasElement>;
  private readonly meterId = signal(this.route.snapshot.paramMap.get('id') ?? '');

  readonly meter = computed(() => this.energyService.getMeter(this.meterId()));
  readonly readings = computed(() => this.energyService.getReadingsForMeter(this.meterId()));
  readonly activeTariff = computed(() => {
    const m = this.meter();
    if (!m) return null;
    return this.energyService.getActiveTariffForDate(m, new Date());
  });

  readonly latestReading = computed(() => this.readings()[0] ?? null);
  readonly hasKwh = computed(() => this.readings().some((r) => r.kwh !== undefined));
  readonly lastConsumption = computed(() => this.readings()[0]?.consumption ?? null);
  readonly chartMode = signal<'consumption' | 'cost' | 'kwh'>('consumption');
  readonly activePhoto = signal<string | null>(null);
  readonly showAddTariff = signal(false);
  newTariff = {
    validFrom: new Date().toISOString().slice(0, 10),
    pricePerUnit: 0,
    baseCharge: 0,
    wastewaterPrice: 0,
    calorificValue: 10.55,
    zNumber: 0.9672,
    note: '',
  };

  private chartInstance: Chart | null = null;

  constructor() {
    effect(() => {
      this.chartMode(); // Signal tracken
      if (this.detailChartRef) {
        setTimeout(() => this.buildChart(), 50);
      }
    });
  }

  ngAfterViewInit(): void {
    this.waitForCanvas();
  }

  private waitForCanvas(): void {
    const observer = new MutationObserver(() => {
      if (this.detailChartRef?.nativeElement) {
        observer.disconnect();
        this.buildChart();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback nach 1s
    setTimeout(() => {
      observer.disconnect();
      if (this.detailChartRef?.nativeElement) this.buildChart();
    }, 1000);
  }

  onTabChange(): void {
    setTimeout(() => this.buildChart(), 50);
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  private buildChart(): void {
    if (!this.detailChartRef || this.readings().length < 2) return;
    this.chartInstance?.destroy();
    const meter = this.meter();
    if (!meter) return;
    const dark = this.themeService.isDark();
    const gridColor = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    const textColor = dark ? '#98989D' : '#6E6E73';
    const rs = [...this.readings()].reverse(); // chronological
    const labels = rs.map((r) =>
      new Date(r.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
    );
    let data: number[], unit: string, label: string;
    if (this.chartMode() === 'kwh') {
      data = rs.map((r) => r.kwh ?? 0);
      unit = 'kWh';
      label = 'Kilowattstunden';
    } else if (this.chartMode() === 'cost') {
      data = rs.map((r) => r.totalCost ?? r.cost ?? 0);
      unit = '€';
      label = 'Kosten';
    } else {
      data = rs.map((r) => r.consumption ?? 0);
      unit = meter.unit;
      label = 'Verbrauch';
    }
    this.chartInstance = new Chart(this.detailChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: meter.color + 'AA',
            borderColor: meter.color,
            borderWidth: 2,
            borderRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${(ctx.raw as number).toFixed(2)} ${unit}` } },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, callback: (v) => v + ' ' + unit },
          },
        },
      },
    });
  }

  getMeta(type: string) {
    return ENERGY_META[type as keyof typeof ENERGY_META];
  }

  saveTariff(meterId: string): void {
    this.energyService.addTariffPeriod(meterId, {
      validFrom: new Date(this.newTariff.validFrom),
      pricePerUnit: +this.newTariff.pricePerUnit,
      baseCharge: +this.newTariff.baseCharge,
      wastewaterPrice: this.newTariff.wastewaterPrice ? +this.newTariff.wastewaterPrice : undefined,
      calorificValue: this.newTariff.calorificValue ? +this.newTariff.calorificValue : undefined,
      zNumber: this.newTariff.zNumber ? +this.newTariff.zNumber : undefined,
      note: this.newTariff.note || undefined,
    });
    this.showAddTariff.set(false);
    this.snackBar.open('Tarif gespeichert', 'OK', { duration: 2000 });
  }

  deleteTariff(meterId: string, periodId: string): void {
    if (confirm('Tarif-Periode löschen?')) {
      this.energyService.deleteTariffPeriod(meterId, periodId);
      this.snackBar.open('Tarif gelöscht', 'OK', { duration: 2000 });
    }
  }

  deleteReading(id: string): void {
    if (confirm('Ablesung löschen?')) {
      this.energyService.deleteReading(id);
      this.snackBar.open('Ablesung gelöscht', 'OK', { duration: 2000 });
    }
  }

  getLatestTariffDate(meter: MeterConfig): Date | null {
    const h = meter.tariffHistory ?? [];
    if (!h.length) return null;
    return new Date(Math.max(...h.map((p) => new Date(p.validFrom).getTime())));
  }
}
