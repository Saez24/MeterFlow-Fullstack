import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Meters } from './features/meters/meters';
import { MeterForm } from './features/meters/meter-form/meter-form';
import { MeterDetail } from './features/meters/meter-detail/meter-detail';
import { Readings } from './features/readings/readings';
import { ReadingsForm } from './features/readings/readings-form/readings-form';
import { Reports } from './features/reports/reports';
import { Settings } from './features/settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: Dashboard },
  {
    path: 'meters',
    children: [
      { path: '', component: Meters },
      { path: 'new', component: MeterForm },
      { path: ':id/edit', component: MeterForm },
      { path: ':id', component: MeterDetail },
    ],
  },
  {
    path: 'readings',
    children: [
      { path: '', component: Readings },
      { path: 'new', component: ReadingsForm },
    ],
  },
  { path: 'reports', component: Reports },
  { path: 'settings', component: Settings },

  { path: '**', redirectTo: 'dashboard' },
];
