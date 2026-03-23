import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TariffHistory } from '../../../../../shared/components/tariff-history/tariff-history';
import { TariffFormComponent } from '../../../../../shared/components/tariff-form/tariff-form';
import { TariffService } from '../../../../../core/services/tariff.service';
import { ReadingService } from '../../../../../core/services/reading.service';
import { MeterDetailStateService } from '../../../../../core/services/meter-detail-state.service';

@Component({
  selector: 'app-meter-tariffs',
  imports: [CommonModule, MatDialogModule, MatSnackBarModule, TariffHistory],
  templateUrl: './meter-tariffs.html',
  styleUrl: './meter-tariffs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterTariffs {
  private readonly tariffService = inject(TariffService);
  private readonly readingService = inject(ReadingService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly state = inject(MeterDetailStateService);

  meter = this.state.meter;

  openTariffDialog(tariffId?: string): void {
    const meter = this.meter();
    if (!meter) return;

    this.dialog.open(TariffFormComponent, {
      data: {
        meter: meter,
        tariffId: tariffId,
      },
      panelClass: 'frosted-glass',
    });
  };

  async deleteTariff(periodId: string): Promise<void> {
    const meter = this.meter();
    if (!meter) return;

    if (confirm('Tarif-Periode löschen?')) {
      await this.tariffService.deleteTariffPeriod(meter.id, periodId);
      await this.readingService.recalculateAllReadingsForMeter(meter.id);
      this.snackBar.open('Tarif gelöscht', 'OK', { duration: 2000 });
    }
  }
}
