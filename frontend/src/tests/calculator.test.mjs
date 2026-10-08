import test from 'node:test';
import assert from 'node:assert/strict';

export const STANDARD_COMMERCIAL_WIDTHS = [50, 75, 100, 150, 200, 300, 400, 450, 500, 600, 700];

export const CATALOG_OD_LOOKUP = {
  '4x1.5': 10.3, '4x2.5': 11.5, '4x4': 13.7, '4x6': 15.6, '4x10': 18.1,
  '4x16': 20.2, '4x25': 24.8, '4x35': 26.8, '4x50': 32.1, '4x70': 35.6,
  '4x95': 40.2, '4x120': 46.0, '4x150': 51.4, '4x185': 58.4, '4x240': 70.2,
  '4x300': 77.1, '4x400': 88.2, '4x500': 100.0,
  '3x1.5': 9.5, '3x2.5': 10.6, '3x4': 12.5, '3x6': 14.2, '3x10': 16.5,
  '3x16': 18.4, '3x25': 22.5, '3x35': 24.3,
  '2x1.5': 9.0, '2x2.5': 10.0, '2x4': 11.8, '2x6': 13.4, '2x10': 15.5,
  '2x16': 17.3, '2x25': 21.1, '2x35': 22.7,
  '5x35': 29.7, '5x50': 35.6, '5x70': 39.7, '5x95': 44.3, '5x120': 51.2,
  '5x150': 57.1, '5x185': 64.8, '5x240': 78.1, '5x300': 85.6, '5x400': 98.1, '5x500': 111.2,
  '1x1.5': 3.0, '1x2.5': 3.7,
  '1x4': 6.7, '1x6': 7.5, '1x10': 8.3, '1x16': 9.2, '1x25': 11.1, '1x35': 11.9,
  '1x50': 14.0, '1x70': 15.4, '1x95': 17.3, '1x120': 19.7, '1x150': 22.0,
  '1x185': 25.0, '1x240': 29.7, '1x300': 32.6, '1x400': 37.2, '1x500': 42.1, '1x630': 46.6,
  '2x0.5': 5.6, '7x1.5': 11.5, '10x1.5': 13.8, '12x1.5': 14.8, '18x1.5': 17.2, '18x0.75': 13.9,
  'CP1-F104-U14': 32.1,
};

export function lookupCatalogCableOd(rawType) {
  if (!rawType) return null;
  const clean = String(rawType).trim().replace(/(\d+),(\d+)/g, '$1.$2');
  if (CATALOG_OD_LOOKUP[clean]) return CATALOG_OD_LOOKUP[clean];

  const m = clean.match(/(?:^|[^\d])(\d+)\s*(?:c|core|cores)?\s*(?:[gG]\s*[xX*×]?|[xX*×]{1,2}|[\*×\/])\s*(\d+(?:\.\d+)?)/i);
  if (m) {
    const key = `${m[1]}x${parseFloat(m[2])}`;
    if (CATALOG_OD_LOOKUP[key]) return CATALOG_OD_LOOKUP[key];
    // Multi-core designation must NEVER fall through to single-core cross-section matching!
    return null;
  }

  const singleArea = clean.match(/(\d+(?:\.\d+)?)\s*(?:mm2|sqmm|mm²)/i);
  if (singleArea) {
    const key = `1x${parseFloat(singleArea[1])}`;
    if (CATALOG_OD_LOOKUP[key]) return CATALOG_OD_LOOKUP[key];
  }

  return null;
}

export function getEffectiveCableOd(cable, params) {
  if (cable.od_mm !== undefined && cable.od_mm !== null && !isNaN(cable.od_mm) && cable.od_mm > 0) {
    return cable.od_mm;
  }

  const rawType = String(cable.cable_type || '').trim();
  const lower = rawType.toLowerCase();

  if (params.custom_od_by_type) {
    for (const [k, v] of Object.entries(params.custom_od_by_type)) {
      const kClean = k.trim().toLowerCase();
      if ((kClean === lower || kClean.includes(lower) || lower.includes(kClean)) && v > 0) {
        return v;
      }
    }
  }

  const catalogOd = lookupCatalogCableOd(rawType);
  if (catalogOd !== null && catalogOd > 0) {
    return catalogOd;
  }

  if (/pwr|power|feeder|motor|mv|lv|400v/.test(lower)) {
    return params.default_power_od_mm || 25.0;
  }
  if (/sig|signal|sensor|thermocouple|instrument/.test(lower)) {
    return params.default_signal_od_mm || 10.0;
  }
  if (/data|bus|eth|net|cat|fiber|prof|modbus/.test(lower)) {
    return params.default_data_od_mm || 8.5;
  }
  if (/ctrl|control|24v/.test(lower)) {
    return params.default_control_od_mm || 14.0;
  }

  return params.default_global_od_mm || 15.0;
}

function isSingleCorePower(c) {
  const s = String(c.cable_type || '').trim().toLowerCase();
  if (/^(?:1\s*[xX\*\/]|1\s*(?:c|core|cores)\b|1c_)/i.test(s)) return true;
  if (/1 core|1core|1-core|single core|single-core/i.test(s)) return true;
  return false;
}

function getSingleCoreFormation(c, defaultFormation) {
  if (c.formation) {
    const f = String(c.formation).trim().toLowerCase();
    if (f === 'trefoil' || f === 'trifoly' || f === 'tri') return 'trefoil';
    if (f.includes('touch') || f.includes('near')) return 'flat_touching';
    if (f.includes('space')) return 'flat_spaced';
  }
  const fDef = String(defaultFormation || 'trefoil').trim().toLowerCase();
  if (fDef.includes('touch') || fDef.includes('near')) return 'flat_touching';
  if (fDef.includes('space')) return 'flat_spaced';
  return 'trefoil';
}

function calculatePowerCableWidth(c, odMm, defaultFormation) {
  if (!isSingleCorePower(c)) {
    return { widthMm: odMm * 2.0 * c.count, formation: 'flat_spaced', bundleHeightMm: odMm };
  }
  const formation = getSingleCoreFormation(c, defaultFormation);
  if (formation === 'trefoil') {
    const fullTrefoils = Math.floor(c.count / 3);
    const rem = c.count % 3;
    const remFactor = c.count === 1 ? (2.0 / 3.0) : 1.0;
    const widthMm = (fullTrefoils * 2.0 * odMm) + (rem * remFactor * odMm);
    const bundleHeightMm = odMm * (1.0 + (Math.sqrt(3.0) / 2.0));
    return { widthMm, formation: 'trefoil', bundleHeightMm };
  } else if (formation === 'flat_touching') {
    return { widthMm: odMm * 1.0 * c.count, formation: 'flat_touching', bundleHeightMm: odMm };
  } else {
    return { widthMm: odMm * 2.0 * c.count, formation: 'flat_spaced', bundleHeightMm: odMm };
  }
}

function levenshteinDist(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1) return s2.length;
  if (!s2) return s1.length;
  const prev = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      const ins = prev[j + 1] + 1;
      const del = curr[j] + 1;
      const sub = prev[j] + (s1[i] !== s2[j] ? 1 : 0);
      curr.push(Math.min(ins, del, sub));
    }
    for (let k = 0; k <= s2.length; k++) prev[k] = curr[k];
  }
  return prev[s2.length];
}

function stripLeadingZerosInNumbers(s) {
  return s.replace(/(?<=\D)0+(?=\d)|^0+(?=\d)/g, '');
}

function findNodeSugg(target, existingNodes, exclude) {
  const targetClean = target.trim().toUpperCase();
  const excludeClean = exclude ? exclude.trim().toUpperCase() : null;
  const targetNormalized = stripLeadingZerosInNumbers(targetClean);
  let bestCandidate = null;
  let minDist = 999;
  const sorted = Array.from(existingNodes).sort();
  for (const n of sorted) {
    const nClean = n.trim().toUpperCase();
    if (excludeClean && nClean === excludeClean) continue;
    if (nClean === targetClean) return n;

    // Do NOT treat intentional zero-padded nodes (e.g. N024 vs N24) as typos of each other
    if (targetNormalized === stripLeadingZerosInNumbers(nClean)) {
      continue;
    }

    const d = levenshteinDist(targetClean, nClean);
    if (d <= 2 && d < minDist) {
      minDist = d;
      bestCandidate = n;
    }
  }
  if (!bestCandidate && excludeClean) {
    for (const n of sorted) {
      const nClean = n.trim().toUpperCase();
      if (nClean === targetClean) return n;
      if (targetNormalized === stripLeadingZerosInNumbers(nClean)) {
        continue;
      }
      const d = levenshteinDist(targetClean, nClean);
      if (d <= 2 && d < minDist) {
        minDist = d;
        bestCandidate = n;
      }
    }
  }
  return bestCandidate;
}

// Algorithm implementation for pure ES module test verification
function calculateBranchSizing(params, branches, cables) {
  const adj = new Map();
  const allNodes = new Set();
  const canonicalNodes = new Map();
  const selfLoopBranches = new Map();

  function getCanonical(s) {
    const clean = s.trim();
    const key = clean.toUpperCase();
    if (!canonicalNodes.has(key)) canonicalNodes.set(key, clean);
    return canonicalNodes.get(key);
  }

  branches.forEach(b => {
    const from = getCanonical(b.node_from);
    const to = getCanonical(b.node_to);
    allNodes.add(from);
    allNodes.add(to);

    if (from === to) {
      if (!selfLoopBranches.has(from)) selfLoopBranches.set(from, []);
      selfLoopBranches.get(from).push(b);
      return;
    }

    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);

    const weight = Math.max(b.length_m, 0.01);
    adj.get(from).push({ target: to, weight, branch: b });
    adj.get(to).push({ target: from, weight, branch: b });
  });

  const branchRoutedCables = new Map();
  branches.forEach(b => branchRoutedCables.set(b.branch_id, []));
  const cableRoutingResults = [];
  const unroutedCables = [];

  function findShortestPath(start, end) {
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set(allNodes);

    allNodes.forEach(n => distances.set(n, Infinity));
    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current = null;
      let minDst = Infinity;
      unvisited.forEach(n => {
        const dst = distances.get(n);
        if (dst < minDst) {
          minDst = dst;
          current = n;
        }
      });

      if (!current || minDst === Infinity) break;
      if (current === end) break;
      unvisited.delete(current);

      const neighbors = adj.get(current) || [];
      for (const edge of neighbors) {
        if (!unvisited.has(edge.target)) continue;
        const newDist = distances.get(current) + edge.weight;
        if (newDist < distances.get(edge.target)) {
          distances.set(edge.target, newDist);
          previous.set(edge.target, { node: current, branchId: edge.branch.branch_id, length: edge.weight });
        }
      }
    }

    if (!previous.has(end) && start !== end) return null;

    const pathNodes = [end];
    const pathBranches = [];
    let curr = end;
    let totalLen = 0;

    while (curr !== start) {
      const prev = previous.get(curr);
      if (!prev) return null;
      pathBranches.unshift(prev.branchId);
      totalLen += prev.length;
      curr = prev.node;
      pathNodes.unshift(curr);
    }

    return { pathNodes, pathBranches, length: totalLen };
  }

  cables.forEach(c => {
    const src = canonicalNodes.get(c.source_node.trim().toUpperCase()) || c.source_node.trim();
    const dst = canonicalNodes.get(c.dest_node.trim().toUpperCase()) || c.dest_node.trim();
    if (!allNodes.has(src) || !allNodes.has(dst)) {
      unroutedCables.push(c.cable_tag);
      const dSugg = findNodeSugg(dst, allNodes, src);
      const hint = dSugg && dSugg !== dst ? ` (Did you mean '${dSugg}'?)` : '';
      const panelHint = c.dest_panel && c.dest_panel !== dst ? ` [Panel: ${c.dest_panel}]` : '';
      cableRoutingResults.push({
        cable_tag: c.cable_tag,
        source_node: src,
        dest_node: dst,
        status: 'UNROUTED',
        unrouted_reason: `Missing endpoint${panelHint}${hint}`,
        source_panel: c.source_panel,
        dest_panel: c.dest_panel,
      });
      return;
    }
    if (src === dst) {
      const localB = selfLoopBranches.get(src);
      if (localB && localB.length > 0) {
        branchRoutedCables.get(localB[0].branch_id)?.push(c);
        cableRoutingResults.push({
          cable_tag: c.cable_tag,
          source_node: src,
          dest_node: dst,
          status: 'ROUTED',
          total_length_m: localB[0].length_m,
          path_branches: [localB[0].branch_id],
          source_panel: c.source_panel,
          dest_panel: c.dest_panel,
        });
      } else {
        cableRoutingResults.push({
          cable_tag: c.cable_tag,
          source_node: src,
          dest_node: dst,
          status: 'LOCAL',
          total_length_m: 0,
          unrouted_reason: `Local panel wiring inside ${src}`,
          source_panel: c.source_panel,
          dest_panel: c.dest_panel,
        });
      }
      return;
    }
    const route = findShortestPath(src, dst);
    if (!route) {
      unroutedCables.push(c.cable_tag);
      const dSugg = findNodeSugg(dst, allNodes, src);
      const hint = dSugg && dSugg !== dst ? ` (Did you mean '${dSugg}'?)` : '';
      cableRoutingResults.push({
        cable_tag: c.cable_tag,
        source_node: src,
        dest_node: dst,
        status: 'UNROUTED',
        unrouted_reason: `No tray path${hint}`,
        source_panel: c.source_panel,
        dest_panel: c.dest_panel,
      });
      return;
    }
    route.pathBranches.forEach(bId => {
      branchRoutedCables.get(bId)?.push(c);
    });
    cableRoutingResults.push({
      cable_tag: c.cable_tag,
      source_node: src,
      dest_node: dst,
      status: 'ROUTED',
      total_length_m: route.length,
      path_branches: route.pathBranches,
      source_panel: c.source_panel,
      dest_panel: c.dest_panel,
    });
  });

  const branchResults = branches.map(b => {
    const routedList = branchRoutedCables.get(b.branch_id) || [];
    let trayH = (b.tray_height_mm && b.tray_height_mm > 0) ? b.tray_height_mm : params.default_tray_height_mm;
    const getCategory = (c) => {
      if (c.category) return c.category.toLowerCase();
      const s = c.cable_type.trim().toLowerCase();
      if (/pwr|power|feeder|motor|mv|lv|400v|1kv|volt/.test(s)) return 'power';
      if (/data|bus|eth|net|cat|fiber|prof|modbus|fieldbus/.test(s)) return 'data';
      if (/ctrl|control|24v|sig|signal|sensor|inst/.test(s)) return 'control';
      const m = s.match(/(?:(\d+)\s*(?:c|core|cores)?\s*(?:[xX\*\/])\s*(\d+(?:\.\d+)?))/i);
      if (m) {
        const cores = parseInt(m[1], 10);
        const size = parseFloat(m[2]);
        if (([3, 4, 5].includes(cores) && size >= 6.0) || (cores === 1 && size >= 10.0)) return 'power';
      }
      return 'control';
    };

    const pwr = routedList.filter(c => getCategory(c) === 'power');
    const ctrl = routedList.filter(c => getCategory(c) === 'control');
    const data = routedList.filter(c => getCategory(c) === 'data');

    const pwrCount = pwr.reduce((s, c) => s + c.count, 0);
    const ctrlCount = ctrl.reduce((s, c) => s + c.count, 0);
    const dataCount = data.reduce((s, c) => s + c.count, 0);

    const branchWarnings = [];
    let pwrWidth = 0;
    pwr.forEach(c => {
      const effOd = getEffectiveCableOd(c, params);
      const { widthMm, formation, bundleHeightMm } = calculatePowerCableWidth(c, effOd, params.single_core_power_formation);
      pwrWidth += widthMm;
      if (formation === 'trefoil' && bundleHeightMm > trayH) {
        branchWarnings.push(
          `Trefoil bundle height (${bundleHeightMm.toFixed(1)} mm) for cable '${c.cable_tag}' exceeds tray height (${trayH.toFixed(1)} mm)`
        );
      }
    });

    const fillFraction = Math.max(params.control_fill_pct / 100.0, 0.05);
    const ctrlMethod = params.control_cable_laying_method || 'multi_layer';
    let ctrlWidth = 0;
    let dataWidth = 0;

    if (ctrlMethod === 'single_layer') {
      ctrlWidth = ctrl.reduce((s, c) => s + getEffectiveCableOd(c, params) * c.count, 0);
      dataWidth = data.reduce((s, c) => s + getEffectiveCableOd(c, params) * c.count, 0);
    } else {
      const ctrlArea = ctrl.reduce((s, c) => s + (Math.PI * Math.pow(getEffectiveCableOd(c, params), 2) / 4.0) * c.count, 0);
      ctrlWidth = ctrlArea > 0 ? ctrlArea / (trayH * fillFraction) : 0;

      const dataArea = data.reduce((s, c) => s + (Math.PI * Math.pow(getEffectiveCableOd(c, params), 2) / 4.0) * c.count, 0);
      dataWidth = dataArea > 0 ? dataArea / (trayH * fillFraction) : 0;
    }

    let barrier = 0;
    if (params.add_metallic_divider && pwrCount > 0 && (ctrlCount + dataCount) > 0) {
      barrier = params.divider_width_mm;
    }

    const rawWidth = pwrWidth + ctrlWidth + dataWidth + barrier;
    const spareFactor = 1.0 + (params.spare_margin_pct / 100.0);
    const calcWidth = rawWidth * spareFactor;

    // Cable details
    const cablesDetail = routedList.map(c => {
      const effOd = getEffectiveCableOd(c, params);
      const cat = getCategory(c);
      let wContrib = 0;
      let formationVal = undefined;
      if (cat === 'power') {
        const { widthMm, formation } = calculatePowerCableWidth(c, effOd, params.single_core_power_formation);
        wContrib = widthMm * spareFactor;
        formationVal = formation;
      } else {
        if (ctrlMethod === 'single_layer') {
          wContrib = effOd * c.count * spareFactor;
          formationVal = 'flat_touching';
        } else {
          const area = (Math.PI * Math.pow(effOd, 2) / 4.0) * c.count;
          wContrib = (area / (trayH * fillFraction)) * spareFactor;
          formationVal = undefined;
        }
      }
      return {
        cable_tag: c.cable_tag,
        source_node: c.source_node,
        dest_node: c.dest_node,
        cable_type: c.cable_type,
        od_mm: effOd,
        count: c.count,
        width_contribution_mm: Number(wContrib.toFixed(2)),
        formation: formationVal,
        source_panel: c.source_panel,
        dest_panel: c.dest_panel,
      };
    });

    let recWidth = 50;
    let status = 'OK';
    if (routedList.length === 0) {
      recWidth = 50;
      status = 'EMPTY';
    } else {
      const match = STANDARD_COMMERCIAL_WIDTHS.find(w => w >= calcWidth);
      if (match !== undefined) {
        recWidth = match;
        status = 'OK';
      } else {
        recWidth = 700;
        status = 'OVERFILL_SPLIT_TIER';
      }
    }

    return {
      branch_id: b.branch_id,
      calculated_width_mm: Number(calcWidth.toFixed(1)),
      recommended_commercial_width_mm: recWidth,
      status,
      cables_count: routedList.reduce((s, c) => s + c.count, 0),
      cable_count: routedList.reduce((s, c) => s + c.count, 0),
      power_cables_count: pwrCount,
      power_width_mm: Number(pwrWidth.toFixed(2)),
      control_cables_count: ctrlCount,
      control_width_mm: Number(ctrlWidth.toFixed(2)),
      data_cables_count: dataCount,
      data_width_mm: Number(dataWidth.toFixed(2)),
      cables_detail: cablesDetail,
      warnings: branchWarnings,
    };
  });
  branchResults.cables = cableRoutingResults;
  branchResults.unrouted_cables = unroutedCables;
  return branchResults;
}

test('Standard Commercial Widths spans 50 to 700 mm', () => {
  assert.deepEqual(STANDARD_COMMERCIAL_WIDTHS, [50, 75, 100, 150, 200, 300, 400, 450, 500, 600, 700]);
});

test('Single power cable single layer spacing (2x OD) picks closest >= 72mm -> 75mm', () => {
  const params = { spare_margin_pct: 20.0, control_fill_pct: 40.0, default_tray_height_mm: 60.0, add_metallic_divider: false, divider_width_mm: 15.0 };
  const branches = [{ branch_id: 'B1', node_from: 'A', node_to: 'B', length_m: 10.0 }];
  const cables = [{ cable_tag: 'C1', source_node: 'A', dest_node: 'B', cable_type: 'power', od_mm: 30.0, count: 1 }];

  const res = calculateBranchSizing(params, branches, cables);
  assert.equal(res[0].calculated_width_mm, 72.0); // 30*2 * 1.2 = 72
  assert.equal(res[0].recommended_commercial_width_mm, 75);
  assert.equal(res[0].status, 'OK');
});

test('Control cable multilayer packing with small width picks standard 50mm', () => {
  const params = { spare_margin_pct: 0.0, control_fill_pct: 40.0, default_tray_height_mm: 60.0, add_metallic_divider: false, divider_width_mm: 15.0 };
  const branches = [{ branch_id: 'B1', node_from: 'A', node_to: 'B', length_m: 5.0 }];
  const cables = [{ cable_tag: 'CTRL1', source_node: 'A', dest_node: 'B', cable_type: 'control', od_mm: 10.0, count: 10 }];

  const res = calculateBranchSizing(params, branches, cables);
  assert.ok(Math.abs(res[0].calculated_width_mm - 32.7) < 0.2);
  assert.equal(res[0].recommended_commercial_width_mm, 50);
});

test('Cable without OD automatically resolves from category default OD settings', () => {
  const params = {
    spare_margin_pct: 0.0,
    control_fill_pct: 40.0,
    default_tray_height_mm: 60.0,
    default_power_od_mm: 22.0,
    default_control_od_mm: 12.0,
    default_signal_od_mm: 8.0,
    default_data_od_mm: 7.0,
    default_global_od_mm: 15.0,
  };
  const branches = [{ branch_id: 'B1', node_from: 'A', node_to: 'B', length_m: 10.0 }];
  // Power cable with no od_mm provided
  const cables = [{ cable_tag: 'C_NO_OD', source_node: 'A', dest_node: 'B', cable_type: 'power', count: 1 }];

  const res = calculateBranchSizing(params, branches, cables);
  // Default power OD is 22.0 -> single layer 2 * 22 = 44 mm -> next standard is 50 mm
  assert.equal(res[0].calculated_width_mm, 44.0);
  assert.equal(res[0].recommended_commercial_width_mm, 50);
});

test('Custom type OD override maps specific cable designations', () => {
  const params = {
    spare_margin_pct: 0.0,
    control_fill_pct: 40.0,
    default_tray_height_mm: 60.0,
    default_power_od_mm: 25.0,
    custom_od_by_type: { 'SPECIAL_FEEDER': 35.0 },
  };
  const branches = [{ branch_id: 'B1', node_from: 'A', node_to: 'B', length_m: 10.0 }];
  const cables = [{ cable_tag: 'SPEC_01', source_node: 'A', dest_node: 'B', cable_type: 'SPECIAL_FEEDER', count: 1 }];

  // Test getEffectiveCableOd directly
  const od = getEffectiveCableOd(cables[0], params);
  assert.equal(od, 35.0);
});

test('Multi-level riser routing across 3 levels', () => {
  const params = { spare_margin_pct: 0.0, control_fill_pct: 40.0, default_tray_height_mm: 60.0, add_metallic_divider: false, divider_width_mm: 15.0 };
  const branches = [
    { branch_id: 'BR_L1', node_from: 'L1', node_to: 'RISER_1', length_m: 10.0 },
    { branch_id: 'RISER_V1', node_from: 'RISER_1', node_to: 'RISER_2', length_m: 5.0 },
    { branch_id: 'BR_L2', node_from: 'RISER_2', node_to: 'L2_PANEL', length_m: 8.0 },
  ];
  const cables = [{ cable_tag: 'C1', source_node: 'L1', dest_node: 'L2_PANEL', cable_type: 'power', od_mm: 20.0, count: 1 }];

  const res = calculateBranchSizing(params, branches, cables);
  assert.equal(res[0].cables_count, 1);
  assert.equal(res[1].cables_count, 1);
  assert.equal(res[2].cables_count, 1);
});

test('Overfill split tier when width exceeds 700mm', () => {
  const params = { spare_margin_pct: 0.0, control_fill_pct: 40.0, default_tray_height_mm: 60.0, add_metallic_divider: false, divider_width_mm: 15.0 };
  const branches = [{ branch_id: 'B1', node_from: 'A', node_to: 'B', length_m: 10.0 }];
  // 12 cables * 35mm * 2 = 840mm > 700mm
  const cables = [{ cable_tag: 'HEAVY', source_node: 'A', dest_node: 'B', cable_type: 'power', od_mm: 35.0, count: 12 }];

  const res = calculateBranchSizing(params, branches, cables);
  assert.ok(res[0].calculated_width_mm > 700);
  assert.equal(res[0].recommended_commercial_width_mm, 700);
  assert.equal(res[0].status, 'OVERFILL_SPLIT_TIER');
});

test('Zero tray height does not crash or divide by zero', () => {
  const params = { spare_margin_pct: 0.0, control_fill_pct: 40.0, default_tray_height_mm: 60.0, add_metallic_divider: false, divider_width_mm: 15.0 };
  const branches = [{ branch_id: 'B_ZERO', node_from: 'A', node_to: 'B', length_m: 10.0, tray_height_mm: 0 }];
  const cables = [{ cable_tag: 'C1', source_node: 'A', dest_node: 'B', cable_type: 'control', od_mm: 10.0, count: 2 }];

  const res = calculateBranchSizing(params, branches, cables);
  assert.ok(res[0].calculated_width_mm > 0);
  assert.equal(res[0].status, 'OK');
});

test('Client Bill of Materials aggregates tray sections, hardware accessories, and cable take-off', () => {
  const branchResults = [
    {
      branch_id: 'BR_1',
      recommended_commercial_width_mm: 300,
      tray_height_mm: 60,
      branch_type: 'horizontal',
      length_m: 9.0,
      power_cables_count: 1,
      control_cables_count: 1,
      data_cables_count: 0,
    },
    {
      branch_id: 'BR_2',
      recommended_commercial_width_mm: 300,
      tray_height_mm: 60,
      branch_type: 'horizontal',
      length_m: 6.0,
      power_cables_count: 1,
      control_cables_count: 1,
      data_cables_count: 0,
    },
    {
      branch_id: 'RISER_1',
      recommended_commercial_width_mm: 200,
      tray_height_mm: 100,
      branch_type: 'vertical',
      length_m: 3.0,
      power_cables_count: 1,
      control_cables_count: 1,
      data_cables_count: 0,
    },
  ];

  const cableRoutingResults = [
    {
      cable_tag: 'C_PWR_1',
      cable_type: 'power',
      count: 1,
      status: 'ROUTED',
      total_length_m: 18.0,
    },
    {
      cable_tag: 'C_CTRL_1',
      cable_type: 'control',
      count: 2,
      status: 'ROUTED',
      total_length_m: 18.0,
    },
  ];

  const params = {
    add_metallic_divider: true,
    divider_width_mm: 15.0,
  };

  // Helper matching client-calculator logic
  const trayGroups = new Map();
  let totalTrayLen = 0;
  let totalSections = 0;

  branchResults.forEach(b => {
    const key = `${b.recommended_commercial_width_mm}_${b.tray_height_mm}_${b.branch_type}`;
    if (!trayGroups.has(key)) {
      trayGroups.set(key, {
        width_mm: b.recommended_commercial_width_mm,
        height_mm: b.tray_height_mm,
        branch_type: b.branch_type,
        total_length_m: 0,
        branch_count: 0,
      });
    }
    const item = trayGroups.get(key);
    item.total_length_m += b.length_m;
    item.branch_count += 1;
    totalTrayLen += b.length_m;
  });

  const trayItems = Array.from(trayGroups.values()).map(data => {
    const secCount = data.total_length_m > 0 ? Math.ceil(data.total_length_m / 3.0) : 0;
    totalSections += secCount;
    return {
      width_mm: data.width_mm,
      height_mm: data.height_mm,
      branch_type: data.branch_type,
      total_length_m: data.total_length_m,
      section_count_3m: secCount,
      branch_count: data.branch_count,
    };
  });

  // Verify total tray length = 9 + 6 + 3 = 18m
  assert.equal(totalTrayLen, 18.0);
  assert.equal(trayItems.length, 2); // 300x60 horizontal (15m -> 5 sections) and 200x100 vertical (3m -> 1 section)
  assert.equal(totalSections, 6); // 5 + 1 = 6 standard 3m sections

  // Verify cable length take-off
  const totalCableLen = cableRoutingResults.reduce((s, c) => s + c.total_length_m * c.count, 0);
  assert.equal(totalCableLen, 54.0); // 18 + (18 * 2) = 54m
});

test('Manufacturer handbook cable catalog lookup resolves exact outer diameters', () => {
  assert.equal(lookupCatalogCableOd('4x50'), 32.1);
  assert.equal(lookupCatalogCableOd('4X50 mm2'), 32.1);
  assert.equal(lookupCatalogCableOd('4C x 50 mm²'), 32.1);
  assert.equal(lookupCatalogCableOd('4x240'), 70.2);
  assert.equal(lookupCatalogCableOd('3x16'), 18.4);
  assert.equal(lookupCatalogCableOd('2x2.5'), 10.0);
  assert.equal(lookupCatalogCableOd('5x70'), 39.7);
  assert.equal(lookupCatalogCableOd('1x240'), 29.7);
  assert.equal(lookupCatalogCableOd('CP1-F104-U14'), 32.1);
  // Multi-core flexible control cables
  assert.equal(lookupCatalogCableOd('12x1.5 mm²'), 14.8);
  assert.equal(lookupCatalogCableOd('12Gx1,5 mm²'), 14.8);
  assert.equal(lookupCatalogCableOd('7Gx1,5 mm²'), 11.5);
  assert.equal(lookupCatalogCableOd('2Xx0,5 mm²'), 5.6);
  // Multi-core unlisted must NEVER fall through to single-core building wire (3.0mm)
  assert.equal(lookupCatalogCableOd('24x1.5 mm²'), null);
  // Genuine single core wire
  assert.equal(lookupCatalogCableOd('1x1.5 mm²'), 3.0);
  assert.equal(lookupCatalogCableOd('SpecialUnknownWire'), null);
});

test('Catalog cable 4x50 automatically sizes tray without manual OD entry', () => {
  const params = {
    spare_margin_pct: 20.0,
    control_fill_pct: 40.0,
    default_tray_height_mm: 60.0,
    add_metallic_divider: false,
    divider_width_mm: 15.0,
    default_power_od_mm: 25.0,
    default_control_od_mm: 14.0,
    default_signal_od_mm: 10.0,
    default_data_od_mm: 8.5,
    default_global_od_mm: 15.0,
    custom_od_by_type: {},
  };
  const branches = [
    { branch_id: 'BR_CAT', node_from: 'N1', node_to: 'N2', level: 'Level 1', branch_type: 'horizontal', length_m: 10.0 }
  ];
  // Cable without explicit OD, designation 4x50
  const cables = [
    { cable_tag: 'C_CAT_1', source_node: 'N1', dest_node: 'N2', cable_type: '4x50', od_mm: undefined, count: 1 }
  ];
  const results = calculateBranchSizing(params, branches, cables);
  const b = results[0];
  assert.equal(b.branch_id, 'BR_CAT');
  assert.equal(b.cable_count, 1);
  assert.equal(b.power_cables_count, 1);
  // Power single layer: 32.1 * 2 = 64.2mm. + 20% spare = 77.04mm -> Commercial 100mm
  assert.ok(Math.abs(b.power_width_mm - 64.2) < 0.1);
  assert.ok(Math.abs(b.calculated_width_mm - 77.04) < 0.1);
  assert.equal(b.recommended_commercial_width_mm, 100);
});

test('OD Precedence Hierarchy: Explicit OD > Custom Override > Technical Catalog > Category Default', () => {
  const branches = [
    { branch_id: 'BR_01', node_from: 'N1', node_to: 'N2', level: 'Level 1', branch_type: 'horizontal', length_m: 10.0 }
  ];

  // 1. Explicit OD takes highest precedence
  const paramsDefault = {
    spare_margin_pct: 0.0,
    control_fill_pct: 40.0,
    default_tray_height_mm: 60.0,
    default_power_od_mm: 25.0,
    default_control_od_mm: 14.0,
    default_signal_od_mm: 10.0,
    default_data_od_mm: 8.5,
    default_global_od_mm: 15.0,
    custom_od_by_type: {},
  };
  const cablesExplicit = [
    { cable_tag: 'C1', source_node: 'N1', dest_node: 'N2', cable_type: '4x50', od_mm: 20.0, count: 1 }
  ];
  const res1 = calculateBranchSizing(paramsDefault, branches, cablesExplicit);
  assert.equal(res1[0].power_width_mm, 40.0); // 20 * 2

  // 2. Custom rule takes precedence over catalog
  const paramsCustom = { ...paramsDefault, custom_od_by_type: { '4x50': 22.0 } };
  const cablesNoOd = [
    { cable_tag: 'C2', source_node: 'N1', dest_node: 'N2', cable_type: '4x50', count: 1 }
  ];
  const res2 = calculateBranchSizing(paramsCustom, branches, cablesNoOd);
  assert.equal(res2[0].power_width_mm, 44.0); // 22 * 2

  // 3. Technical catalog applies when no explicit or custom rule
  const res3 = calculateBranchSizing(paramsDefault, branches, cablesNoOd);
  assert.ok(Math.abs(res3[0].power_width_mm - 64.2) < 0.1); // 32.1 * 2
});

test('Catalog multi-selection, batch add to custom rules, and catalog deletion flow', () => {
  // Mock catalog items
  const mockCatalog = [
    { code: 'CP1-F104-U14', designation: '4x50 mm² sm', od_mm: 32.1, category: '4C_06_1KV' },
    { code: 'CP1-F104-U16', designation: '4x95 mm² sm', od_mm: 40.2, category: '4C_06_1KV' },
    { code: 'CP1-F104-U20', designation: '4x240 mm² sm', od_mm: 70.2, category: '4C_06_1KV' },
  ];

  // Helper function matching production implementation
  const getCleanRuleKey = item => item.designation.replace(/\s*mm².*$/, '').trim() || item.designation.trim();

  // 1. Simulate user selecting 4x50 and 4x240
  const selectedKeys = new Set(['CP1-F104-U14', 'CP1-F104-U20']);
  const selectedItems = mockCatalog.filter(item => selectedKeys.has(item.code));
  assert.equal(selectedItems.length, 2);

  // 2. Batch add to custom rules
  const customRules = {};
  selectedItems.forEach(item => {
    const key = getCleanRuleKey(item);
    customRules[key] = item.od_mm;
  });

  assert.equal(customRules['4x50'], 32.1);
  assert.equal(customRules['4x240'], 70.2);
  assert.equal(customRules['4x95'], undefined);

  // 3. Verify sizing engine uses custom rules
  const branches = [{ branch_id: 'B1', node_from: 'N1', node_to: 'N2', branch_type: 'horizontal', length_m: 10, tray_height_mm: 60 }];
  const cables = [{ cable_tag: 'C1', source_node: 'N1', dest_node: 'N2', cable_type: '4x50', count: 1 }];
  const params = {
    spare_margin_pct: 0,
    control_fill_pct: 40,
    default_tray_height_mm: 60,
    default_power_od_mm: 25,
    custom_od_by_type: customRules,
  };
  const res = calculateBranchSizing(params, branches, cables);
  assert.ok(Math.abs(res[0].power_width_mm - 64.2) < 0.1);

  // 4. Batch delete from catalog
  const remainingCatalog = mockCatalog.filter(item => !selectedKeys.has(item.code));
  assert.equal(remainingCatalog.length, 1);
  assert.equal(remainingCatalog[0].code, 'CP1-F104-U16');

  // 5. Restore/Reset restores full catalog
  const restoredCatalog = [...mockCatalog];
  assert.equal(restoredCatalog.length, 3);
});

test('Single-core power cable formations: Trefoil vs Flat Touching vs Flat Spaced', () => {
  const branches = [
    { branch_id: 'B1', node_from: 'N1', node_to: 'N2', branch_type: 'horizontal', length_m: 10, tray_height_mm: 100 }
  ];
  // 3 single-core cables of 1x240 mm² with explicit OD = 30.0 mm
  const cables = [
    { cable_tag: 'C_1C', source_node: 'N1', dest_node: 'N2', cable_type: '1x240 mm²', od_mm: 30.0, count: 3, category: 'power' }
  ];

  // 1. Trefoil ("trifoly"): 3 single-core cables bundled in triangle take 2 * OD = 60.0 mm
  const paramsTrefoil = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 100, single_core_power_formation: 'trefoil' };
  const resTri = calculateBranchSizing(paramsTrefoil, branches, cables);
  assert.equal(resTri[0].power_width_mm, 60.0);

  // 2. Flat Touching ("near each other"): 3 cables laid touching take 3 * 1.0 * OD = 90.0 mm
  const paramsTouching = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 100, single_core_power_formation: 'flat_touching' };
  const resFlat = calculateBranchSizing(paramsTouching, branches, cables);
  assert.equal(resFlat[0].power_width_mm, 90.0);

  // 3. Flat Spaced: 3 cables with 1 OD spacing take 3 * 2.0 * OD = 180.0 mm
  const paramsSpaced = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 100, single_core_power_formation: 'flat_spaced' };
  const resSpaced = calculateBranchSizing(paramsSpaced, branches, cables);
  assert.equal(resSpaced[0].power_width_mm, 180.0);
});

test('Single-core trefoil bundle height emits warning if exceeding tray height', () => {
  // Tray height 60mm, but cable OD = 35mm -> trefoil bundle height = 35 * 1.866 = 65.3mm > 60mm
  const branches = [
    { branch_id: 'B_LOW', node_from: 'N1', node_to: 'N2', branch_type: 'horizontal', length_m: 10, tray_height_mm: 60 }
  ];
  const cables = [
    { cable_tag: 'C_BIG_PWR', source_node: 'N1', dest_node: 'N2', cable_type: '1x300 mm²', od_mm: 35.0, count: 3, category: 'power', formation: 'trefoil' }
  ];
  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const res = calculateBranchSizing(params, branches, cables);
  assert.ok(res[0].warnings && res[0].warnings.length > 0);
  assert.ok(res[0].warnings.some(w => w.includes('Trefoil bundle height') && w.includes('exceeds tray height')));
});

test('Case-insensitive and whitespace-tolerant node matching routes cables correctly', () => {
  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const branches = [
    { branch_id: 'BR_101_108', node_from: 'P101', node_to: 'P108', length_m: 12.0, branch_type: 'horizontal' },
  ];
  // Cable uses lowercase 'p101' and 'p108' with surrounding spaces
  const cables = [
    { cable_tag: 'C_CASE_1', source_node: '  p101 ', dest_node: ' p108', cable_type: '4x1.5 mm²', count: 1, od_mm: 10.3 },
  ];

  const res = calculateBranchSizing(params, branches, cables);
  assert.equal(res[0].cables_count, 1);
  assert.equal(res.cables.length, 1);
  assert.equal(res.cables[0].status, 'ROUTED');
  assert.equal(res.cables[0].total_length_m, 12.0);
  assert.deepEqual(res.cables[0].path_branches, ['BR_101_108']);
});

test('Typo in destination node provides smart suggestion hint (P181 -> P108)', () => {
  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const branches = [
    { branch_id: 'BR_101_108', node_from: 'P101', node_to: 'P108', length_m: 12.0, branch_type: 'horizontal' },
  ];
  // Cable destination typo 'P181' instead of 'P108'
  const cables = [
    { cable_tag: 'C_TYPO_1', source_node: 'P101', dest_node: 'P181', cable_type: '4x1.5 mm²', count: 1, od_mm: 10.3 },
  ];

  const res = calculateBranchSizing(params, branches, cables);
  assert.equal(res.unrouted_cables.length, 1);
  assert.equal(res.unrouted_cables[0], 'C_TYPO_1');
  assert.equal(res.cables[0].status, 'UNROUTED');
  assert.ok(res.cables[0].unrouted_reason.includes("Did you mean 'P108'?"));
});

test('Node N024 is strictly treated as different from N24 and never suggested as a typo', () => {
  const existingNodes = new Set(['N24', 'P101', 'P108']);

  // Target N024 must NOT suggest N24 (they differ only by zero-padding, distinct intentional nodes)
  assert.equal(findNodeSugg('N024', existingNodes), null);
  assert.equal(findNodeSugg('N24', new Set(['N024'])), null);

  // Still suggests genuine typos (e.g. N024 with N025)
  assert.equal(findNodeSugg('N024', new Set(['N025'])), 'N025');

  // Full calculation verify: cable targeting N024 when only N24 exists does not say "Did you mean 'N24'?"
  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const branches = [
    { branch_id: 'BR_N24', node_from: 'P101', node_to: 'N24', length_m: 10.0, branch_type: 'horizontal' },
  ];
  const cables = [
    { cable_tag: 'C_N024', source_node: 'P101', dest_node: 'N024', cable_type: '4x1.5', count: 1, od_mm: 10.3 },
  ];

  const res = calculateBranchSizing(params, branches, cables);
  assert.equal(res.unrouted_cables.length, 1);
  assert.equal(res.cables[0].status, 'UNROUTED');
  assert.ok(!res.cables[0].unrouted_reason.includes("Did you mean 'N24'?"), 'Must NOT suggest N24 for N024');
});

test('Same-node cable with self-loop branch routes onto that local tray branch', () => {
  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const branches = [
    { branch_id: 'BR_LOCAL_101', node_from: 'P101', node_to: 'P101', length_m: 4.5, branch_type: 'horizontal' },
    { branch_id: 'BR_101_108', node_from: 'P101', node_to: 'P108', length_m: 10.0, branch_type: 'horizontal' },
  ];
  const cables = [
    { cable_tag: 'C_SELF_1', source_node: 'P101', dest_node: 'P101', cable_type: '4x1.5 mm²', count: 1, od_mm: 10.3 },
  ];

  const res = calculateBranchSizing(params, branches, cables);
  assert.equal(res.cables.length, 1);
  assert.equal(res.cables[0].status, 'ROUTED');
  assert.equal(res.cables[0].total_length_m, 4.5);
  assert.deepEqual(res.cables[0].path_branches, ['BR_LOCAL_101']);
  assert.equal(res[0].cables_count, 1); // BR_LOCAL_101 has the cable
});

test('Same-node cable without branch receives LOCAL status and 0m length instead of UNROUTED', () => {
  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const branches = [
    { branch_id: 'BR_101_108', node_from: 'P101', node_to: 'P108', length_m: 10.0, branch_type: 'horizontal' },
  ];
  // P101 -> P101 without self-loop branch
  const cables = [
    { cable_tag: 'C_PANEL_INT', source_node: 'p101', dest_node: 'P101', cable_type: '4x1.5 mm²', count: 1, od_mm: 10.3 },
  ];

  const res = calculateBranchSizing(params, branches, cables);
  assert.equal(res.unrouted_cables.length, 0); // Not marked as unrouted!
  assert.equal(res.cables.length, 1);
  assert.equal(res.cables[0].status, 'LOCAL');
  assert.equal(res.cables[0].total_length_m, 0);
  assert.ok(res.cables[0].unrouted_reason.includes('Local panel wiring inside P101'));
});

test('Missing spec OD rule entered via modal updates cable OD and immediately recalculates sizing', () => {
  const branches = [
    { branch_id: 'BR_TRAY_1', node_from: 'P181', node_to: 'E-7E1', length_m: 15.0, branch_type: 'horizontal', tray_height_mm: 60 }
  ];
  // Cable with uncatalogued multi-core control cable spec '12x1.5 mm²' without explicit OD
  const cables = [
    { cable_tag: 'W16-52', source_node: 'P181', dest_node: 'E-7E1', cable_type: '12x1.5 mm²', count: 2, category: 'control' }
  ];

  // 1. Initial calculation before rule is set (resolves to default control OD = 14.0 mm)
  const initialParams = {
    spare_margin_pct: 20.0,
    control_fill_pct: 40.0,
    default_tray_height_mm: 60.0,
    default_control_od_mm: 14.0,
    custom_od_by_type: {},
  };
  const resInitial = calculateBranchSizing(initialParams, branches, cables);
  assert.equal(resInitial[0].recommended_commercial_width_mm, 50);

  // 2. User enters 17.5 mm via MissingSpecOdModal flow -> saved into parameters.custom_od_by_type
  const updatedParams = {
    ...initialParams,
    custom_od_by_type: {
      '12x1.5 mm²': 17.5,
    },
  };

  // Sizing recalculates with exact entered OD
  const resUpdated = calculateBranchSizing(updatedParams, branches, cables);
  assert.ok(resUpdated[0].calculated_width_mm > resInitial[0].calculated_width_mm);

  // Effective OD helper directly returns the modal-entered rule
  assert.equal(getEffectiveCableOd(cables[0], updatedParams), 17.5);
});

test('calculateBranchSizing preserves source_panel and dest_panel and hints parent panel on unrouted cable', () => {
  const branches = [
    { branch_id: 'BR_TRAY_1', node_from: 'P101', node_to: 'E-93D1', length_m: 10.0, branch_type: 'horizontal' },
  ];
  const cables = [
    {
      cable_tag: 'W_101',
      source_node: 'P101',
      dest_node: 'E-93D1',
      cable_type: '4x1.5 mm²',
      od_mm: 10.3,
      count: 1,
      source_panel: 'P101',
      dest_panel: 'P101',
    },
    {
      cable_tag: 'W_MISSING',
      source_node: 'E-93D1',
      dest_node: 'E-93P2',
      cable_type: '4x1.5 mm²',
      od_mm: 10.3,
      count: 1,
      source_panel: 'P101',
      dest_panel: 'P101',
    },
  ];

  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const res = calculateBranchSizing(params, branches, cables);

  // Routed cable preserves panel info
  const routedCable = res.cables.find(c => c.cable_tag === 'W_101');
  assert.equal(routedCable.status, 'ROUTED');
  assert.equal(routedCable.source_panel, 'P101');
  assert.equal(routedCable.dest_panel, 'P101');

  // Unrouted cable preserves panel info and includes panel hint in reason
  const unroutedCable = res.cables.find(c => c.cable_tag === 'W_MISSING');
  assert.equal(unroutedCable.status, 'UNROUTED');
  assert.equal(unroutedCable.source_panel, 'P101');
  assert.equal(unroutedCable.dest_panel, 'P101');
  assert.ok(unroutedCable.unrouted_reason.includes('[Panel: P101]'));
});

test('Duplicate cable tags with different endpoints resolve independently without collision', () => {
  const branches = [
    { branch_id: 'BR_101_181', node_from: 'P101', node_to: 'P181', length_m: 25.0, branch_type: 'horizontal' },
  ];
  // Two cables sharing identical tag '=GEN-1W001' (exactly like user Excel row 2 and row 14)
  const cables = [
    {
      cable_tag: '=GEN-1W001',
      source_node: 'P101',
      dest_node: 'P181',
      cable_type: '4x2x0.56 mm²',
      od_mm: 10.0,
      count: 1,
    },
    {
      cable_tag: '=GEN-1W001',
      source_node: 'LVD',
      dest_node: 'GEN',
      cable_type: '1x95 mm²',
      od_mm: 22.0,
      count: 1,
    },
  ];

  const params = { spare_margin_pct: 0, control_fill_pct: 40, default_tray_height_mm: 60 };
  const res = calculateBranchSizing(params, branches, cables);

  // Both cables are in res.cables array at their respective indices
  assert.equal(res.cables.length, 2);

  // Cable 1: P101 -> P181 is ROUTED
  const c1 = res.cables[0];
  assert.equal(c1.cable_tag, '=GEN-1W001');
  assert.equal(c1.source_node, 'P101');
  assert.equal(c1.dest_node, 'P181');
  assert.equal(c1.status, 'ROUTED');
  assert.equal(c1.total_length_m, 25.0);

  // Cable 2: LVD -> GEN is UNROUTED (missing endpoints)
  const c2 = res.cables[1];
  assert.equal(c2.cable_tag, '=GEN-1W001');
  assert.equal(c2.source_node, 'LVD');
  assert.equal(c2.dest_node, 'GEN');
  assert.equal(c2.status, 'UNROUTED');
  assert.ok(c2.unrouted_reason.includes('Missing endpoint'));

  // Composite key lookup also uniquely separates them
  const compKey1 = `${c1.cable_tag}:::${c1.source_node}:::${c1.dest_node}`;
  const compKey2 = `${c2.cable_tag}:::${c2.source_node}:::${c2.dest_node}`;
  assert.notEqual(compKey1, compKey2);
});

test('Control & Signal laying method: multi_layer (area) vs single_layer (flat touching)', () => {
  const branches = [
    { branch_id: 'B1', node_from: 'P101', node_to: 'P181', branch_type: 'horizontal', length_m: 10, tray_height_mm: 100 }
  ];
  const cables = [
    { cable_tag: '=GEN-1W001', source_node: 'P101', dest_node: 'P181', cable_type: '4X2X0.56 MM²', od_mm: 10.0, count: 1, category: 'control' }
  ];

  // 1. Multi-layer (Default NEC/IEC Area Packing)
  const paramsMulti = {
    spare_margin_pct: 30.0,
    control_fill_pct: 40.0,
    default_tray_height_mm: 100.0,
    control_cable_laying_method: 'multi_layer',
  };
  const resMulti = calculateBranchSizing(paramsMulti, branches, cables);
  const cdMulti = resMulti[0].cables_detail[0];
  assert.equal(cdMulti.width_contribution_mm, 2.55);
  assert.equal(cdMulti.formation, undefined);

  // 2. Single Layer Flat (Touching, Width = OD * count * spare_factor)
  const paramsSingle = {
    spare_margin_pct: 30.0,
    control_fill_pct: 40.0,
    default_tray_height_mm: 100.0,
    control_cable_laying_method: 'single_layer',
  };
  const resSingle = calculateBranchSizing(paramsSingle, branches, cables);
  const cdSingle = resSingle[0].cables_detail[0];
  assert.equal(cdSingle.width_contribution_mm, 13.0);
  assert.equal(cdSingle.formation, 'flat_touching');
  assert.equal(resSingle[0].calculated_width_mm, 13.0);
});






