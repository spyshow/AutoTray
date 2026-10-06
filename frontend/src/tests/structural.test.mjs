import test from 'node:test';
import assert from 'node:assert/strict';

// Load-span curves and structural engine test functions
export const LOAD_SPAN_CURVES = {
  60: [
    { span_m: 3.0, allowable_kg_m: 40.0 },
    { span_m: 2.5, allowable_kg_m: 75.0 },
    { span_m: 2.0, allowable_kg_m: 125.0 },
    { span_m: 1.5, allowable_kg_m: 220.0 },
  ],
  100: [
    { span_m: 3.0, allowable_kg_m: 65.0 },
    { span_m: 2.5, allowable_kg_m: 110.0 },
    { span_m: 2.0, allowable_kg_m: 180.0 },
    { span_m: 1.5, allowable_kg_m: 320.0 },
  ],
};

const SAMPLE_CATALOG_WEIGHTS = {
  '4x50': 2540,
  '4x1.5': 180,
  '3x2.5': 155,
  '1x240': 2850,
};

function lookupCatalogWeight(cableType) {
  const clean = cableType.toLowerCase().replace(/mm²|sqmm|mm2/g, '').trim();
  for (const [k, v] of Object.entries(SAMPLE_CATALOG_WEIGHTS)) {
    if (clean.includes(k) || k.includes(clean)) return v;
  }
  return null;
}

function resolveCableWeightKgM(cable) {
  if (cable.weight_kg_m !== undefined && cable.weight_kg_m > 0) {
    return Number(cable.weight_kg_m);
  }
  if (cable.weight_kg_km !== undefined && cable.weight_kg_km > 0) {
    return Number(cable.weight_kg_km) / 1000.0;
  }
  const catWeight = lookupCatalogWeight(cable.cable_type);
  if (catWeight !== null && catWeight > 0) {
    return catWeight / 1000.0;
  }
  const od = cable.od_mm && cable.od_mm > 0 ? cable.od_mm : 15.0;
  const cat = (cable.category || '').toLowerCase();
  let factor = 0.0022;
  if (cat.includes('ctrl') || cat.includes('control')) factor = 0.0018;
  else if (cat.includes('sig') || cat.includes('data') || cat.includes('bus')) factor = 0.0014;
  return Math.max(Math.round(od * od * factor * 1000) / 1000, 0.05);
}

function calculateTrayDeadLoadKgM(width_mm, height_mm = 60, thickness_mm = 1.5, hasCover = false) {
  const steelDensity = 7850.0;
  const t = Math.max(thickness_mm, 0.8) * 1e-3;
  const perimeterM = (width_mm + 2 * height_mm + 30) * 1e-3;
  const trayBodyKgM = perimeterM * t * steelDensity * 0.85;

  let coverKgM = 0.0;
  if (hasCover) {
    const coverPerimeterM = (width_mm + 30) * 1e-3;
    const coverThicknessM = 1.2 * 1e-3;
    coverKgM = coverPerimeterM * coverThicknessM * steelDensity;
  }
  return Math.round((trayBodyKgM + coverKgM) * 100) / 100;
}

function calculateOptimalSupportSpan(totalLoadKgM, trayHeightMm = 60) {
  const curveKey = trayHeightMm >= 90 ? 100 : 60;
  const curve = LOAD_SPAN_CURVES[curveKey];
  for (const entry of curve) {
    if (totalLoadKgM <= entry.allowable_kg_m) {
      return {
        span_m: entry.span_m,
        allowable_load_kg_m: entry.allowable_kg_m,
        utilization_pct: Math.round((totalLoadKgM / entry.allowable_kg_m) * 100),
      };
    }
  }
  const minEntry = curve[curve.length - 1];
  return {
    span_m: minEntry.span_m,
    allowable_load_kg_m: minEntry.allowable_kg_m,
    utilization_pct: Math.round((totalLoadKgM / minEntry.allowable_kg_m) * 100),
  };
}

function calculateBranchSupportsCount(lengthM, spanM, nearFittingCount = 0) {
  if (lengthM <= 0) return 0;
  const linearCount = Math.max(1, Math.ceil(lengthM / spanM));
  return linearCount + nearFittingCount;
}

function generateSupportAccessories(branches) {
  const groups = new Map();
  branches.forEach(b => {
    const qty = b.supports_count || 1;
    const width = b.recommended_commercial_width_mm || 100;
    const mounting = b.support_mounting_type || 'ceiling_trapeze';

    if (mounting === 'wall_cantilever') {
      const key = `wall_bracket_${width}`;
      if (!groups.has(key)) {
        groups.set(key, {
          item_name: `Cantilever Wall Bracket (${width}mm Tray)`,
          category: 'Support',
          quantity: 0,
          unit: 'pcs',
        });
      }
      groups.get(key).quantity += qty;
    } else {
      const key = `trapeze_hanger_${width}`;
      if (!groups.has(key)) {
        groups.set(key, {
          item_name: `Trapeze Ceiling Hanger (${width}mm Tray)`,
          category: 'Support',
          quantity: 0,
          unit: 'pcs',
        });
      }
      groups.get(key).quantity += qty;
    }
  });
  return Array.from(groups.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
}

test('Multi-tier cable weight resolution', async (t) => {
  await t.test('Tier 1: Explicit weight_kg_m takes precedence', () => {
    const cable = {
      cable_type: '4x50 mm²',
      od_mm: 32.0,
      weight_kg_m: 3.15,
    };
    const wt = resolveCableWeightKgM(cable);
    assert.equal(wt, 3.15);
  });

  await t.test('Tier 1: Explicit weight_kg_km converted to kg/m', () => {
    const cable = {
      cable_type: 'Unknown Cable',
      weight_kg_km: 1450,
    };
    const wt = resolveCableWeightKgM(cable);
    assert.equal(wt, 1.45);
  });

  await t.test('Tier 2: Technical catalog match when no explicit weight', () => {
    const cable = {
      cable_type: '4x50 mm²',
      od_mm: 32.0,
    };
    const wt = resolveCableWeightKgM(cable);
    assert.equal(wt, 2.54); // 2540 / 1000
  });

  await t.test('Tier 3: Empirical copper density formula based on OD and category', () => {
    const pwrCable = {
      cable_type: 'Custom Unlisted Power',
      od_mm: 20.0,
      category: 'power',
    };
    const pwrWt = resolveCableWeightKgM(pwrCable);
    assert.equal(pwrWt, Math.round(20.0 * 20.0 * 0.0022 * 1000) / 1000); // 0.880

    const ctrlCable = {
      cable_type: 'Custom Unlisted Control',
      od_mm: 12.0,
      category: 'control',
    };
    const ctrlWt = resolveCableWeightKgM(ctrlCable);
    assert.equal(ctrlWt, Math.round(12.0 * 12.0 * 0.0018 * 1000) / 1000); // 0.259

    const sigCable = {
      cable_type: 'Custom Unlisted Signal',
      od_mm: 10.0,
      category: 'signal',
    };
    const sigWt = resolveCableWeightKgM(sigCable);
    assert.equal(sigWt, Math.round(10.0 * 10.0 * 0.0014 * 1000) / 1000); // 0.140
  });
});

test('Cable tray steel dead load calculation', async (t) => {
  await t.test('300x60mm tray dead weight with 1.5mm sheet and 15% perforation discount', () => {
    const deadLoad = calculateTrayDeadLoadKgM(300, 60, 1.5, false);
    // Perimeter = (300 + 120 + 30) = 450mm = 0.45m
    // Tray weight = 0.45 * 0.0015 * 7850 * 0.85 = 4.50 kg/m
    assert.equal(deadLoad, 4.5);
  });

  await t.test('Tray with sheet cover adds cover steel dead weight', () => {
    const openTray = calculateTrayDeadLoadKgM(300, 60, 1.5, false);
    const coveredTray = calculateTrayDeadLoadKgM(300, 60, 1.5, true);
    assert.ok(coveredTray > openTray);
    // Cover = (300 + 30) * 0.0012 * 7850 = 3.11 kg/m
    // Total = 4.50 + 3.11 = 7.61 kg/m
    assert.equal(coveredTray, 7.61);
  });
});

test('Dynamic IEC 61537 / NEMA VE 1 Safe Working Load span selection', async (t) => {
  await t.test('60mm tray picks optimal span in descending order', () => {
    // 35 kg/m <= 40 kg/m -> 3.0m
    const r1 = calculateOptimalSupportSpan(35.0, 60);
    assert.equal(r1.span_m, 3.0);
    assert.equal(r1.allowable_load_kg_m, 40.0);
    assert.equal(r1.utilization_pct, Math.round((35 / 40) * 100));

    // 60 kg/m <= 75 kg/m -> 2.5m
    const r2 = calculateOptimalSupportSpan(60.0, 60);
    assert.equal(r2.span_m, 2.5);
    assert.equal(r2.allowable_load_kg_m, 75.0);

    // 100 kg/m <= 125 kg/m -> 2.0m
    const r3 = calculateOptimalSupportSpan(100.0, 60);
    assert.equal(r3.span_m, 2.0);
    assert.equal(r3.allowable_load_kg_m, 125.0);

    // 180 kg/m <= 220 kg/m -> 1.5m
    const r4 = calculateOptimalSupportSpan(180.0, 60);
    assert.equal(r4.span_m, 1.5);
    assert.equal(r4.allowable_load_kg_m, 220.0);

    // Exceeds 220 kg/m -> clamps to 1.5m with >100% utilization
    const r5 = calculateOptimalSupportSpan(250.0, 60);
    assert.equal(r5.span_m, 1.5);
    assert.ok(r5.utilization_pct > 100);
  });

  await t.test('100mm tray higher structural capacity', () => {
    // 50 kg/m exceeds 60mm tray 3.0m limit (40 kg/m), but fits 100mm tray 3.0m limit (65 kg/m)
    const r60 = calculateOptimalSupportSpan(50.0, 60);
    const r100 = calculateOptimalSupportSpan(50.0, 100);
    assert.equal(r60.span_m, 2.5);
    assert.equal(r100.span_m, 3.0);
  });
});

test('NEMA VE-2 required supports count calculation', async (t) => {
  await t.test('Linear span count: ceil(length / span)', () => {
    // 10m length with 2.5m span -> 4 supports
    assert.equal(calculateBranchSupportsCount(10.0, 2.5, 0), 4);
    // 7m length with 2.0m span -> ceil(3.5) = 4 supports
    assert.equal(calculateBranchSupportsCount(7.0, 2.0, 0), 4);
  });

  await t.test('Fitting proximity allowance adds junction supports', () => {
    // 10m length with 2.5m span + 1 fitting allowance -> 4 + 1 = 5
    assert.equal(calculateBranchSupportsCount(10.0, 2.5, 1), 5);
  });
});

test('Support hardware grouping by width and mounting style in BOM', () => {
  const branches = [
    {
      recommended_commercial_width_mm: 300,
      supports_count: 4,
      support_mounting_type: 'ceiling_trapeze',
    },
    {
      recommended_commercial_width_mm: 300,
      supports_count: 3,
      support_mounting_type: 'ceiling_trapeze',
    },
    {
      recommended_commercial_width_mm: 150,
      supports_count: 5,
      support_mounting_type: 'wall_cantilever',
    },
  ];

  const items = generateSupportAccessories(branches);
  assert.equal(items.length, 2);

  const trapeze300 = items.find(i => i.item_name.includes('Trapeze') && i.item_name.includes('300mm'));
  assert.ok(trapeze300);
  assert.equal(trapeze300.quantity, 7); // 4 + 3

  const wall150 = items.find(i => i.item_name.includes('Cantilever') && i.item_name.includes('150mm'));
  assert.ok(wall150);
  assert.equal(wall150.quantity, 5);
});
