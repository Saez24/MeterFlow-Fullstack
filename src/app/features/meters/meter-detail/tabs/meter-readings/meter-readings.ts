import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ReadingService } from '../../../../../core/services/reading.service';
import { MeterDetailStateService } from '../../../../../core/services/meter-detail-state.service';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-meter-readings',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatDialogModule],
  providers: [DatePipe],
  templateUrl: './meter-readings.html',
  styleUrl: './meter-readings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterReadings {
  private readonly readingService = inject(ReadingService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly datePipe = inject(DatePipe);
  private readonly state = inject(MeterDetailStateService);

  meter = this.state.meter;
  readings = this.state.readings;
  activePhoto = signal<string | null>(null);

  /** Dynamischer Alt-Text für das Foto-Modal – enthält Zählername + Datum der aktiven Ablesung */
  readonly photoAltText = computed(() => {
    const photo = this.activePhoto();
    if (!photo) return '';
    const reading = this.readings().find(r => r.photo === photo);
    const meter = this.meter();
    if (!reading || !meter) return $localize`:@@meterReadings.photo.alt:Zählerfoto`;
    const dateStr = this.datePipe.transform(reading.date, 'dd.MM.yyyy') ?? '';
    return $localize`:@@meterReadings.photo.altDynamic:${meter.name}:meterName: – Ablesung vom ${dateStr}:date:`;
  });

  async deleteReading(id: string): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: $localize`:@@meterReadings.delete.title:Ablesung löschen`,
          message: $localize`:@@meterReadings.delete.message:Ablesung wirklich löschen?`,
          confirmLabel: $localize`:@@meterReadings.delete.confirm:Löschen`,
        },
      }).afterClosed()
    );
    if (!confirmed) return;
    this.readingService.deleteReading(id);
    this.snackBar.open($localize`:@@meterReadings.deleted:Ablesung gelöscht`, 'OK', { duration: 2000 });
  }
}
