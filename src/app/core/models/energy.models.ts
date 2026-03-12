// ------------------------
// Energy Types & Units
// ------------------------
export enum EnergyType {
  Electricity = 'electricity',
  Gas = 'gas',
  Water = 'water',
  GardenWater = 'garden_water',
  HeatingOil = 'heating_oil',
  Solar = 'solar',
}

export type UnitByEnergyType = {
  [EnergyType.Electricity]: 'kWh';
  [EnergyType.Gas]: 'm³';
  [EnergyType.Water]: 'm³';
  [EnergyType.GardenWater]: 'm³';
  [EnergyType.HeatingOil]: 'Liter';
  [EnergyType.Solar]: 'kWh';
};

export type MaterialIcon =
  | 'bolt'
  | 'local_fire_department'
  | 'water_drop'
  | 'yard'
  | 'oil_barrel'
  | 'wb_sunny';

// ------------------------
// Meter Config
// ------------------------
export interface MeterConfig<T extends EnergyType = EnergyType> {
  id: string;
  name: string;
  type: T;
  calorificValue?: number;
  zNumber?: number;
  unit: UnitByEnergyType[T];
  icon: MaterialIcon;
  color: string;
  active: boolean;
  createdAt: Date;

  // Tariff
  pricePerUnit: number; // €/Unit
  baseCharge: number; // €/month

  // Water-specific
  wastewaterPrice?: number; // €/m³ (nur water & garden_water)
  linkedWaterMeterId?: string; // garden_water -> water meter

  // Gas-specific
  gasConversion?: {
    calorificValue: number; // kWh/m³
    zNumber: number; // Zustandszahl
  };

  // Notes
  meterNumber?: string;
  provider?: string;
  notes?: string;
}

// ------------------------
// Meter Reading
// ------------------------
export interface MeterReading {
  id: string;
  meterId: string;
  consumption: number;
  kwh?: number;
  cost: number;
  wastewaterCost?: number;
  totalCost: number;
  date: Date;
  value: number;
  note?: string;
}

// ------------------------
// Water Bill
// ------------------------
export interface WaterBill {
  meterId: string; // main water meter id
  month: number; // 1-12
  year: number;
  totalConsumption: number; // m³ gesamt
  gardenConsumption: number; // m³ Garten (kein Abwasser)
  billableWastewater: number; // totalConsumption - gardenConsumption
  freshwaterCost: number; // €/m³ * totalConsumption
  wastewaterCost: number;
  totalCost: number; // freshwaterCost + wastewaterCost
}

// ------------------------
// Statistics
// ------------------------
export interface MonthStats {
  year: number;
  month: number; // 1-12
  label: string; // "Jan 24"
  byMeter: Record<string, { consumption: number; cost: number; unit: string }>;
  totalCost: number;
}

export interface YearStats {
  year: number;
  totalCost: number;
  byMeter: Record<string, { consumption: number; cost: number }>;
  months: MonthStats[];
}

// ------------------------
// Constants
// ------------------------
export const ENERGY_META: Record<
  EnergyType,
  { label: string; icon: MaterialIcon; color: string; unit: string }
> = {
  [EnergyType.Electricity]: { label: 'Strom', icon: 'bolt', color: '#F59E0B', unit: 'kWh' },
  [EnergyType.Gas]: { label: 'Gas', icon: 'local_fire_department', color: '#3B82F6', unit: 'm³' },
  [EnergyType.Water]: { label: 'Wasser', icon: 'water_drop', color: '#06B6D4', unit: 'm³' },
  [EnergyType.GardenWater]: { label: 'Gartenwasser', icon: 'yard', color: '#10B981', unit: 'm³' },
  [EnergyType.HeatingOil]: { label: 'Heizöl', icon: 'oil_barrel', color: '#F97316', unit: 'Liter' },
  [EnergyType.Solar]: { label: 'Solar', icon: 'wb_sunny', color: '#EAB308', unit: 'kWh' },
};

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
] as const;
