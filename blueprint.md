# Blueprint: MeterFlow

## 1. Overview

MeterFlow is an application for tracking energy and water consumption. It helps users to monitor their usage, costs, and budgets for different meters like electricity, gas, and water. It features a dashboard with statistics, detailed reports, and management for meters and tariffs.

### Technology Stack
- **Framework:** Angular
- **State Management:** Signals
- **Build System:** Vite + esbuild
- **Test Runner:** Vitest

## 2. Features Log

### 2026-03-21: Fix Water Bill Calculation

- **Feature:** Corrected the annual water bill calculation in the reports section.
- **Change:** The calculation for the total water bill was incorrect because it did not include the monthly base charge (`Grundgebühr`).
- **Implementation:**
  - Modified the `WaterBill` data model to include a `baseCharge` property.
  - Updated the `StatsService` to fetch the `baseCharge` from the active tariff and include it in the monthly bill calculation.
  - The yearly total in the `DashboardStateService` now correctly sums up these base charges.
  - The UI in the `reports` component was updated to display the base charge in a separate column for transparency, making the final sum correct and easy to understand.
- **Rationale:** This change fixes a critical bug in the core functionality of the app, ensuring that users see a correct and complete summary of their water costs for the year, as requested by the user.
