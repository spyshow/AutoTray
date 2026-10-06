import {
  Branch,
  BranchSizingResult,
  Cable,
  CableRoutedDetail,
  SupportMountingType,
  AccessoryBomItem,
} from './types';
import { lookupCatalogCableWeightKgKm } from './cable-catalog';

export interface SpanLoadRating {
  span_m: number;
  allowable_load_kg_m: number;
  utilization_pct: number;
}

/**
 * Standard IEC 61537 / NEMA VE 1 Safe Working Load (SWL) curves for industrial cable trays
 * with deflection limit L/200.
 */
export const LOAD_SPAN_CURVES: Record<number, { span_m: number; allowable_kg_m: number }[]> = {
  // 60mm Flange Height
  60: [
    { span_m: 3.0, allowable_kg_m: 40.0 },
    { span_m: 2.5, allowable_kg_m: 75.0 },
    { span_m: 2.0, allowable_kg_m: 125.0 },
    { span_m: 1.5, allowable_kg_m: 220.0 },
  ],
  // 100mm Flange Height (Stiffer section modulus)
  100: [
    { span_m: 3.0, allowable_kg_m: 65.0 },
    { span_m: 2.5, allowable_kg_m: 110.0 },
    { span_m: 2.0, allowable_kg_m: 180.0 },
    { span_m: 1.5, allowable_kg_m: 320.0 },
  ],
};

/**
 * Resolves linear weight (kg/m) for a cable using multi-tier resolution:
 * 1. Explicit cable.weight_kg_m or cable.weight_kg_km / 1000
 * 2. Technical handbook catalog match
 * 3. Empirical copper/sheath density estimation based on outer diameter (OD)
 */
export function resolveCableWeightKgM(cable: {
  weight_kg_m?: number;
  weight_kg_km?: number;
  cable_type: string;
  od_mm?: number;
  category?: string;
}): number {
  // Tier 1: Explicit weight
  if (cable.weight_kg_m !== undefined && cable.weight_kg_m > 0) {
    return Number(cable.weight_kg_m);
  }
  if (cable.weight_kg_km !== undefined && cable.weight_kg_km > 0) {
    return Number(cable.weight_kg_km) / 1000.0;
  }

  // Tier 2: Catalog match
  const catWeightKgKm = lookupCatalogCableWeightKgKm(cable.cable_type);
  if (catWeightKgKm !== null && catWeightKgKm > 0) {
    return catWeightKgKm / 1000.0;
  }

  // Tier 3: Empirical density formula from outer diameter (OD)
  const od = cable.od_mm && cable.od_mm > 0 ? cable.od_mm : 15.0;
  const cat = (cable.category || '').toLowerCase();

  let densityFactor = 0.0022; // Power default (Cu conductors + PVC/XLPE insulation & sheath)
  if (cat.includes('ctrl') || cat.includes('control')) {
    densityFactor = 0.0018;
  } else if (cat.includes('sig') || cat.includes('data') || cat.includes('bus')) {
    densityFactor = 0.0014;
  }

  const estimated = Math.round(od * od * densityFactor * 1000) / 1000;
  return Math.max(estimated, 0.05);
}

/**
 * Calculates cable tray steel dead load per meter (kg/m).
 * Factoring sheet thickness (default 1.5mm), standard perforation discount (-15%),
 * and optional tray cover.
 */
export function calculateTrayDeadLoadKgM(
  width_mm: number,
  height_mm: number = 60,
  thickness_mm: number = 1.5,
  hasCover: boolean = false
): number {
  const steelDensityKgM3 = 7850.0;
  const t = Math.max(thickness_mm, 0.8) * 1e-3; // meters

  // Tray body perimeter: Width + 2*Height + return flanges (approx 30mm total)
  const perimeterM = (width_mm + 2 * height_mm + 30) * 1e-3;
  // Perforated slot discount: 15% material removed
  const trayBodyKgM = perimeterM * t * steelDensityKgM3 * 0.85;

  let coverKgM = 0.0;
  if (hasCover) {
    const coverPerimeterM = (width_mm + 30) * 1e-3;
    const coverThicknessM = 1.2 * 1e-3; // standard 1.2mm sheet cover
    coverKgM = coverPerimeterM * coverThicknessM * steelDensityKgM3;
  }

  return Math.round((trayBodyKgM + coverKgM) * 100) / 100;
}

/**
 * Determines the optimal safe support span (1.5m, 2.0m, 2.5m, or 3.0m)
 * based on IEC 61537 / NEMA VE 1 Safe Working Load (SWL).
 */
export function calculateOptimalSupportSpan(
  totalLoadKgM: number,
  trayHeightMm: number = 60
): SpanLoadRating {
  const curveKey = trayHeightMm >= 90 ? 100 : 60;
  const curve = LOAD_SPAN_CURVES[curveKey];

  // Evaluate spans in descending order: 3.0m -> 2.5m -> 2.0m -> 1.5m
  for (const entry of curve) {
    if (totalLoadKgM <= entry.allowable_kg_m) {
      const util = Math.round((totalLoadKgM / entry.allowable_kg_m) * 100);
      return {
        span_m: entry.span_m,
        allowable_load_kg_m: entry.allowable_kg_m,
        utilization_pct: util,
      };
    }
  }

  // If load exceeds allowable load at 1.5m, return 1.5m with >100% utilization
  const minSpanEntry = curve[curve.length - 1];
  const util = Math.round((totalLoadKgM / minSpanEntry.allowable_kg_m) * 100);
  return {
    span_m: minSpanEntry.span_m,
    allowable_load_kg_m: minSpanEntry.allowable_kg_m,
    utilization_pct: util,
  };
}

/**
 * Calculates required supports count for a branch according to NEMA VE-2:
 * Linear supports along straight run = ceil(length / span)
 * + dedicated supports within 600mm of each junction fitting.
 */
export function calculateBranchSupportsCount(
  lengthM: number,
  spanM: number,
  nearFittingCount: number = 0
): number {
  if (lengthM <= 0) return 0;
  const linearCount = Math.max(1, Math.ceil(lengthM / spanM));
  return linearCount + nearFittingCount;
}

/**
 * Generates BOM support hardware accessories grouped by mounting style and tray width.
 */
export function generateStructuralSupportAccessories(
  branches: BranchSizingResult[]
): AccessoryBomItem[] {
  // Map of group key -> { name, category, description, quantity, unit }
  const supportGroups = new Map<string, AccessoryBomItem>();

  branches.forEach(b => {
    const qty = b.supports_count || 1;
    const width = b.recommended_commercial_width_mm || 100;
    const mounting = b.support_mounting_type || 'ceiling_trapeze';

    if (mounting === 'wall_cantilever') {
      const key = `wall_bracket_${width}`;
      const name = `Cantilever Wall Support Bracket (${width}mm Tray)`;
      const desc = `Heavy-duty hot-dip galvanized steel cantilever arm with slotted wall-anchor base for ${width}mm cable tray runs.`;
      if (!supportGroups.has(key)) {
        supportGroups.set(key, {
          item_name: name,
          category: 'Support',
          description: desc,
          quantity: 0,
          unit: 'pcs',
        });
      }
      supportGroups.get(key)!.quantity += qty;
    } else {
      const key = `trapeze_hanger_${width}`;
      const name = `Trapeze Ceiling Support Hanger (${width}mm Tray)`;
      const desc = `Ceiling suspension assembly: 41×41mm Unistrut channel sized for ${width}mm tray, dual M10 threaded drop rods, nuts & channel spring nuts.`;
      if (!supportGroups.has(key)) {
        supportGroups.set(key, {
          item_name: name,
          category: 'Support',
          description: desc,
          quantity: 0,
          unit: 'pcs',
        });
      }
      supportGroups.get(key)!.quantity += qty;
    }
  });

  return Array.from(supportGroups.values()).sort((a, b) =>
    a.item_name.localeCompare(b.item_name)
  );
}
