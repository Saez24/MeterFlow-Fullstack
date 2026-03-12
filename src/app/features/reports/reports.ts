import {
  Component,
  inject,
  signal,
  computed,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { EnergyService } from '../../core/services/energy.service';
import { ThemeService } from '../../core/services/theme.service';
import { ENERGY_META, MONTH_NAMES } from '../../core/models/energy.models';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements AfterViewInit, OnDestroy {
  private readonly energyService = inject(EnergyService);
  private readonly themeService = inject(ThemeService);

  @ViewChild('costChart') costChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('consumptionChart') consumptionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('yearChart') yearChartRef!: ElementRef<HTMLCanvasElement>;

  readonly ENERGY_META = ENERGY_META;
  readonly MONTH_NAMES = MONTH_NAMES;

  readonly availableYears = this.energyService.availableYears;
  readonly activeMeters = this.energyService.activeMeters;
  readonly waterBills = this.energyService.waterBillStats;
  selectedYear = signal(this.availableYears()[0] ?? new Date().getFullYear());
  readonly selectedMeterChart = signal<string>(this.activeMeters()[0]?.id ?? '');

  private costChartInstance: Chart | null = null;
  private consumptionChartInstance: Chart | null = null;
  private yearChartInstance: Chart | null = null;

  readonly yearStats = computed(() => this.energyService.getYearStats(this.selectedYear()));

  readonly waterBillsForYear = computed(() =>
    this.waterBills().filter((b) => b.year === this.selectedYear()),
  );

  readonly waterTotals = computed(() => {
    const bills = this.waterBillsForYear();
    return {
      totalM3: bills.reduce((s, b) => s + b.totalConsumption, 0),
      gardenM3: bills.reduce((s, b) => s + b.gardenConsumption, 0),
      billableM3: bills.reduce((s, b) => s + b.billableWastewater, 0),
      freshCost: bills.reduce((s, b) => s + b.freshwaterCost, 0),
      wasteCost: bills.reduce((s, b) => s + b.wastewaterCost, 0),
      total: bills.reduce((s, b) => s + b.totalCost, 0),
    };
  });

  constructor() {
    effect(() => {
      this.themeService.isDark();
      this.selectedYear();
      this.selectedMeterChart();

      if (!this.costChartRef) return;

      this.buildAllCharts();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.buildAllCharts(), 100);
  }

  ngOnDestroy(): void {
    this.costChartInstance?.destroy();
    this.consumptionChartInstance?.destroy();
    this.yearChartInstance?.destroy();
  }

  private buildAllCharts(): void {
    this.buildCostChart();
    this.buildConsumptionChart();
    if (this.availableYears().length > 1) this.buildYearChart();
  }

  private chartDefaults() {
    const dark = this.themeService.isDark();
    return {
      gridColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      textColor: dark ? '#98989D' : '#6E6E73',
      tickColor: dark ? '#98989D' : '#6E6E73',
    };
  }

  private buildCostChart(): void {
    this.costChartInstance?.destroy();
    const { gridColor, textColor } = this.chartDefaults();
    const months = this.energyService.getMonthStats(this.selectedYear());
    const meters = this.activeMeters();

    const datasets = meters.map((meter) => ({
      label: meter.name,
      data: months.map((m) => m.byMeter[meter.id]?.cost ?? 0),
      backgroundColor: meter.color + 'CC',
      borderColor: meter.color,
      borderWidth: 1,
      borderRadius: 6,
    }));

    this.costChartInstance = new Chart(this.costChartRef.nativeElement, {
      type: 'bar',
      data: { labels: months.map((m) => m.label), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.raw as number).toFixed(2)} €`,
            },
          },
        },
        scales: {
          x: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } },
          y: {
            stacked: true,
            grid: { color: gridColor },
            ticks: { color: textColor, callback: (v) => v + ' €' },
          },
        },
      },
    });
  }

  private buildConsumptionChart(): void {
    this.consumptionChartInstance?.destroy();
    const { gridColor, textColor } = this.chartDefaults();
    const meterId = this.selectedMeterChart();
    const meter = this.activeMeters().find((m) => m.id === meterId);
    if (!meter) return;

    const months = this.energyService.getMonthStats(this.selectedYear());
    const data = months.map((m) => m.byMeter[meterId]?.consumption ?? 0);
    const unit = ENERGY_META[meter.type].unit;

    this.consumptionChartInstance = new Chart(this.consumptionChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: months.map((m) => m.label),
        datasets: [
          {
            label: meter.name,
            data,
            backgroundColor: meter.color + 'AA',
            borderColor: meter.color,
            borderWidth: 2,
            borderRadius: 8,
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

  private buildYearChart(): void {
    this.yearChartInstance?.destroy();
    if (!this.yearChartRef) return;
    const { gridColor, textColor } = this.chartDefaults();
    const years = this.availableYears();
    const data = years.map((y) => this.energyService.getYearStats(y).totalCost);

    this.yearChartInstance = new Chart(this.yearChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: years.map(String),
        datasets: [
          {
            label: 'Gesamtkosten',
            data,
            backgroundColor: years.map((_, i) =>
              i === 0 ? 'rgba(79,70,229,0.8)' : 'rgba(79,70,229,0.4)',
            ),
            borderColor: '#4F46E5',
            borderWidth: 2,
            borderRadius: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${(ctx.raw as number).toFixed(2)} €` } },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, callback: (v) => v + ' €' } },
        },
      },
    });
  }
}
