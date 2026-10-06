import {
  CalculationParameters,
  Branch,
  Cable,
  CalculationResponse,
  BranchSizingResult,
  CableRoutingResult,
  CableRoutedDetail,
  CalculationSummary,
  Diagnostics,
  BillOfMaterials,
  TrayBomItem,
  AccessoryBomItem,
  CableBomItem,
  CableFormation,
  CalculatedNodeFitting,
  NodeFittingConfig,
} from './types';
import { lookupCatalogCableOd } from './cable-catalog';
import { calculateNetworkNodeFittings, generateFittingsAndReducersBom } from './fittings-engine';

export const STANDARD_COMMERCIAL_WIDTHS = [50, 75, 100, 150, 200, 300, 400, 450, 500, 600, 700];

export function getEffectiveCableOd(cable: Cable, params: CalculationParameters): number {
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

  // Manufacturer technical handbook catalog lookup (e.g. 4x50 -> 32.1, 4x240 -> 70.2, 3x16 -> 18.4)
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

export function isSingleCorePower(c: Cable): boolean {
  const s = String(c.cable_type || '').trim().toLowerCase();
  if (/^(?:1\s*[xX\*\/]|1\s*(?:c|core|cores)\b|1c_)/i.test(s)) return true;
  if (/1 core|1core|1-core|single core|single-core/i.test(s)) return true;
  return false;
}

export function getSingleCoreFormation(c: Cable, defaultFormation?: CableFormation): CableFormation {
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

export function calculatePowerCableWidth(
  c: Cable,
  odMm: number,
  defaultFormation?: CableFormation
): { widthMm: number; formation: CableFormation; bundleHeightMm: number } {
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

interface GraphEdge {
  target: string;
  weight: number;
  branch: Branch;
}

function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1) return s2.length;
  if (!s2) return s1.length;
  const prev: number[] = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i++) {
    const curr: number[] = [i + 1];
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

function findNodeSuggestion(target: string, existingNodes: Set<string>, exclude?: string | null): string | null {
  const targetClean = target.trim().toUpperCase();
  const excludeClean = exclude ? exclude.trim().toUpperCase() : null;
  let bestCandidate: string | null = null;
  let minDist = 999;
  const sortedNodes = Array.from(existingNodes).sort();
  for (const n of sortedNodes) {
    const nClean = n.trim().toUpperCase();
    if (excludeClean && nClean === excludeClean) continue;
    if (nClean === targetClean) return n;
    const d = levenshteinDistance(targetClean, nClean);
    if (d <= 2 && d < minDist) {
      minDist = d;
      bestCandidate = n;
    }
  }
  if (!bestCandidate && excludeClean) {
    for (const n of sortedNodes) {
      const nClean = n.trim().toUpperCase();
      const d = levenshteinDistance(targetClean, nClean);
      if (d <= 2 && d < minDist) {
        minDist = d;
        bestCandidate = n;
      }
    }
  }
  return bestCandidate;
}

export function solveRoutingAndSizingClient(
  parameters: CalculationParameters,
  branches: Branch[],
  cables: Cable[],
  nodeConfigs?: Record<string, NodeFittingConfig> | null
): CalculationResponse {
  // Build graph adjacency list with Canonical Node Mapping
  const adj = new Map<string, GraphEdge[]>();
  const allNodes = new Set<string>();
  const canonicalNodes = new Map<string, string>(); // UPPERCASE -> Original Display Case
  const selfLoopBranches = new Map<string, Branch[]>(); // node -> branches where node_from == node_to

  function getCanonical(nodeStr: string): string {
    const s = nodeStr.trim();
    const key = s.toUpperCase();
    if (!canonicalNodes.has(key)) {
      canonicalNodes.set(key, s);
    }
    return canonicalNodes.get(key)!;
  }

  branches.forEach(b => {
    const from = getCanonical(b.node_from);
    const to = getCanonical(b.node_to);
    allNodes.add(from);
    allNodes.add(to);

    if (from === to) {
      if (!selfLoopBranches.has(from)) selfLoopBranches.set(from, []);
      selfLoopBranches.get(from)!.push(b);
      return;
    }

    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);

    const weight = Math.max(b.length_m, 0.01);
    adj.get(from)!.push({ target: to, weight, branch: b });
    adj.get(to)!.push({ target: from, weight, branch: b });
  });

  // Track routed cables per branch
  const branchRoutedCables = new Map<string, Cable[]>();
  branches.forEach(b => branchRoutedCables.set(b.branch_id, []));

  const missingNodes = new Set<string>();
  const unroutedCables: string[] = [];
  const cableRoutingResults: CableRoutingResult[] = [];
  let totalCableLengthRouted = 0;

  // Dijkstra Shortest Path
  function findShortestPath(start: string, end: string): { pathNodes: string[]; pathBranches: string[]; length: number } | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, { node: string; branchId: string; length: number }>();
    const unvisited = new Set<string>(allNodes);

    allNodes.forEach(n => distances.set(n, Infinity));
    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current: string | null = null;
      let minDst = Infinity;
      unvisited.forEach(n => {
        const dst = distances.get(n)!;
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
        const newDist = distances.get(current)! + edge.weight;
        if (newDist < distances.get(edge.target)!) {
          distances.set(edge.target, newDist);
          previous.set(edge.target, { node: current, branchId: edge.branch.branch_id, length: edge.weight });
        }
      }
    }

    if (!previous.has(end) && start !== end) return null;

    // Reconstruct path
    const pathNodes: string[] = [end];
    const pathBranches: string[] = [];
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

  // Route each cable
  cables.forEach(c => {
    const effOd = getEffectiveCableOd(c, parameters);
    const sRaw = c.source_node.trim();
    const dRaw = c.dest_node.trim();
    const src = canonicalNodes.get(sRaw.toUpperCase()) || sRaw;
    const dst = canonicalNodes.get(dRaw.toUpperCase()) || dRaw;

    const srcMissing = !allNodes.has(src);
    const dstMissing = !allNodes.has(dst);

    if (srcMissing) missingNodes.add(src);
    if (dstMissing) missingNodes.add(dst);

    if (srcMissing || dstMissing) {
      unroutedCables.push(c.cable_tag);
      const missingParts: string[] = [];
      if (srcMissing) {
        const sSugg = findNodeSuggestion(src, allNodes, dst);
        const sHint = sSugg && sSugg !== src ? ` (Did you mean '${sSugg}'?)` : '';
        const panelHint = c.source_panel && c.source_panel !== src ? ` [Panel: ${c.source_panel}]` : '';
        missingParts.push(`Source '${src}'${panelHint}${sHint}`);
      }
      if (dstMissing) {
        const dSugg = findNodeSuggestion(dst, allNodes, src);
        const dHint = dSugg && dSugg !== dst ? ` (Did you mean '${dSugg}'?)` : '';
        const panelHint = c.dest_panel && c.dest_panel !== dst ? ` [Panel: ${c.dest_panel}]` : '';
        missingParts.push(`Dest '${dst}'${panelHint}${dHint}`);
      }
      cableRoutingResults.push({
        cable_tag: c.cable_tag,
        source_node: src,
        dest_node: dst,
        cable_type: c.cable_type,
        od_mm: effOd,
        count: c.count,
        status: 'UNROUTED',
        total_length_m: 0,
        unrouted_reason: `Endpoint missing in tray network: ${missingParts.join(', ')}`,
        source_panel: c.source_panel,
        dest_panel: c.dest_panel,
      });
      return;
    }

    if (src === dst) {
      // Check if an explicit self-loop branch exists (e.g. branch between P101 and P101)
      const localBranches = selfLoopBranches.get(src);
      if (localBranches && localBranches.length > 0) {
        const localB = localBranches[0];
        branchRoutedCables.get(localB.branch_id)?.push(c);
        totalCableLengthRouted += localB.length_m * c.count;
        cableRoutingResults.push({
          cable_tag: c.cable_tag,
          source_node: src,
          dest_node: dst,
          cable_type: c.cable_type,
          od_mm: effOd,
          count: c.count,
          status: 'ROUTED',
          path_nodes: [src],
          path_branches: [localB.branch_id],
          total_length_m: Math.round(localB.length_m * 100) / 100,
          source_panel: c.source_panel,
          dest_panel: c.dest_panel,
        });
      } else {
        // Internal panel wiring (Source & Destination are identical)
        // Valid local connection; does not require external tray routing.
        cableRoutingResults.push({
          cable_tag: c.cable_tag,
          source_node: src,
          dest_node: dst,
          cable_type: c.cable_type,
          od_mm: effOd,
          count: c.count,
          status: 'LOCAL',
          path_nodes: [src],
          path_branches: [],
          total_length_m: 0,
          unrouted_reason: `Local panel wiring inside ${src} (no external tray required)`,
          source_panel: c.source_panel,
          dest_panel: c.dest_panel,
        });
      }
      return;
    }

    const route = findShortestPath(src, dst);
    if (!route) {
      unroutedCables.push(c.cable_tag);
      const dSugg = findNodeSuggestion(dst, allNodes, src);
      const suggestionText = dSugg && dSugg !== dst ? ` (Did you mean '${dSugg}'?)` : '';
      cableRoutingResults.push({
        cable_tag: c.cable_tag,
        source_node: src,
        dest_node: dst,
        cable_type: c.cable_type,
        od_mm: effOd,
        count: c.count,
        status: 'UNROUTED',
        total_length_m: 0,
        unrouted_reason: `No tray path exists between '${src}' and '${dst}'.${suggestionText}`,
        source_panel: c.source_panel,
        dest_panel: c.dest_panel,
      });
      return;
    }

    totalCableLengthRouted += route.length * c.count;
    route.pathBranches.forEach(bId => {
      branchRoutedCables.get(bId)?.push(c);
    });

    cableRoutingResults.push({
      cable_tag: c.cable_tag,
      source_node: src,
      dest_node: dst,
      cable_type: c.cable_type,
      od_mm: effOd,
      count: c.count,
      status: 'ROUTED',
      path_nodes: route.pathNodes,
      path_branches: route.pathBranches,
      total_length_m: Number(route.length.toFixed(2)),
      source_panel: c.source_panel,
      dest_panel: c.dest_panel,
    });
  });

  // Calculate sizing for each branch
  let maxFillPct = 0;
  let maxFillBranchId: string | null = null;
  let overfilledCount = 0;
  const branchResults: BranchSizingResult[] = [];

  branches.forEach(b => {
    const routedList = branchRoutedCables.get(b.branch_id) || [];
    let trayH = (b.tray_height_mm && b.tray_height_mm > 0) ? b.tray_height_mm : parameters.default_tray_height_mm;
    if (trayH <= 0) trayH = 60.0;

    const getCategory = (c: Cable): string => {
      if (c.category) return c.category.toLowerCase();
      const s = c.cable_type.trim().toLowerCase();
      if (/pwr|power|feeder|motor|mv|lv|400v|1kv|volt/.test(s)) return 'power';
      if (/data|bus|eth|net|cat|fiber|prof|modbus|fieldbus/.test(s)) return 'data';
      if (/ctrl|control|24v|sig|signal|sensor|inst/.test(s)) return 'control';
      const m = s.match(/(?:(\d+)\s*(?:c|core|cores)?\s*(?:[xX\*\/])\s*(\d+(?:\.\d+)?))/i);
      if (m) {
        const cores = parseInt(m[1], 10);
        const size = parseFloat(m[2]);
        if ([3, 4, 5].includes(cores) && size >= 6.0) return 'power';
      }
      return 'control';
    };

    const pwr = routedList.filter(c => getCategory(c) === 'power');
    const ctrl = routedList.filter(c => getCategory(c) === 'control');
    const data = routedList.filter(c => getCategory(c) === 'data');

    const totalCables = routedList.reduce((sum, c) => sum + c.count, 0);
    const pwrCount = pwr.reduce((sum, c) => sum + c.count, 0);
    const ctrlCount = ctrl.reduce((sum, c) => sum + c.count, 0);
    const dataCount = data.reduce((sum, c) => sum + c.count, 0);

    // Power (Single Layer with 2x OD spacing for multi-core, or Trefoil / Flat Touching / Flat Spaced for 1-core)
    const branchWarnings: string[] = [];
    let pwrWidth = 0;
    pwr.forEach(c => {
      const effOd = getEffectiveCableOd(c, parameters);
      const { widthMm, formation, bundleHeightMm } = calculatePowerCableWidth(c, effOd, parameters.single_core_power_formation);
      pwrWidth += widthMm;
      if (formation === 'trefoil' && bundleHeightMm > trayH) {
        branchWarnings.push(
          `Trefoil bundle height (${bundleHeightMm.toFixed(1)} mm) for cable '${c.cable_tag}' exceeds tray height (${trayH.toFixed(1)} mm)`
        );
      }
    });

    // Control & Data (Multilayer area vs Single Layer Flat Touching)
    const fillFraction = Math.max(parameters.control_fill_pct / 100.0, 0.05);
    const ctrlMethod = parameters.control_cable_laying_method || 'multi_layer';
    let ctrlWidth = 0;
    let dataWidth = 0;

    if (ctrlMethod === 'single_layer') {
      ctrlWidth = ctrl.reduce((sum, c) => {
        const effOd = getEffectiveCableOd(c, parameters);
        return sum + effOd * c.count;
      }, 0);
      dataWidth = data.reduce((sum, c) => {
        const effOd = getEffectiveCableOd(c, parameters);
        return sum + effOd * c.count;
      }, 0);
    } else {
      const ctrlArea = ctrl.reduce((sum, c) => {
        const effOd = getEffectiveCableOd(c, parameters);
        return sum + (Math.PI * Math.pow(effOd, 2) / 4.0) * c.count;
      }, 0);
      ctrlWidth = ctrlArea > 0 ? ctrlArea / (trayH * fillFraction) : 0;

      const dataArea = data.reduce((sum, c) => {
        const effOd = getEffectiveCableOd(c, parameters);
        return sum + (Math.PI * Math.pow(effOd, 2) / 4.0) * c.count;
      }, 0);
      dataWidth = dataArea > 0 ? dataArea / (trayH * fillFraction) : 0;
    }

    // Metallic Divider
    let barrierWidth = 0;
    if (parameters.add_metallic_divider && pwrCount > 0 && (ctrlCount + dataCount) > 0) {
      barrierWidth = parameters.divider_width_mm;
    }

    const rawWidth = pwrWidth + ctrlWidth + dataWidth + barrierWidth;
    const spareFactor = 1.0 + (parameters.spare_margin_pct / 100.0);
    const calculatedWidth = rawWidth * spareFactor;

    // Cable details
    const cablesDetail: CableRoutedDetail[] = routedList.map(c => {
      const effOd = getEffectiveCableOd(c, parameters);
      const cat = getCategory(c);
      let wContrib = 0;
      let formationVal: CableFormation | undefined = undefined;
      if (cat === 'power') {
        const { widthMm, formation } = calculatePowerCableWidth(c, effOd, parameters.single_core_power_formation);
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

    const minStdWidth = STANDARD_COMMERCIAL_WIDTHS[0];
    const maxStdWidth = STANDARD_COMMERCIAL_WIDTHS[STANDARD_COMMERCIAL_WIDTHS.length - 1];

    let recWidth = minStdWidth;
    let fillPct = 0;
    let status = 'OK';

    if (totalCables === 0) {
      recWidth = minStdWidth;
      fillPct = 0;
      status = 'EMPTY';
    } else {
      const match = STANDARD_COMMERCIAL_WIDTHS.find(w => w >= calculatedWidth);
      if (match !== undefined) {
        recWidth = match;
        status = 'OK';
        fillPct = Number(((calculatedWidth / recWidth) * 100).toFixed(1));
      } else {
        recWidth = maxStdWidth;
        status = 'OVERFILL_SPLIT_TIER';
        fillPct = Number(((calculatedWidth / maxStdWidth) * 100).toFixed(1));
        overfilledCount++;
      }
    }

    if (fillPct > maxFillPct && totalCables > 0) {
      maxFillPct = fillPct;
      maxFillBranchId = b.branch_id;
    }

    // Deduplicated list of cables routed
    const uniqueCablesRouted = Array.from(new Set(routedList.map(c => c.cable_tag)));

    branchResults.push({
      branch_id: b.branch_id,
      node_from: b.node_from,
      node_to: b.node_to,
      level: b.level,
      branch_type: b.branch_type,
      length_m: Number(b.length_m.toFixed(2)),
      tray_height_mm: trayH,
      cable_count: totalCables,
      power_cables_count: pwrCount,
      control_cables_count: ctrlCount,
      data_cables_count: dataCount,
      power_width_mm: Number(pwrWidth.toFixed(2)),
      control_width_mm: Number(ctrlWidth.toFixed(2)),
      data_width_mm: Number(dataWidth.toFixed(2)),
      barrier_width_mm: barrierWidth,
      calculated_width_mm: Number(calculatedWidth.toFixed(1)),
      recommended_commercial_width_mm: recWidth,
      fill_ratio_pct: fillPct,
      cables_routed: uniqueCablesRouted,
      cables_detail: cablesDetail,
      status,
      warnings: branchWarnings,
    });
  });

  const totalRouted = cables.length - unroutedCables.length;
  const totalTrayLength = branches.reduce((sum, b) => sum + b.length_m, 0);

  // Compute disconnected nodes in client engine (nodes not in main connected component)
  const visited = new Set<string>();
  const components: string[][] = [];
  allNodes.forEach(node => {
    if (!visited.has(node)) {
      const comp: string[] = [];
      const queue = [node];
      visited.add(node);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);
        const neighbors = adj.get(curr) || [];
        neighbors.forEach(e => {
          if (!visited.has(e.target)) {
            visited.add(e.target);
            queue.push(e.target);
          }
        });
      }
      components.push(comp);
    }
  });

  const disconnectedNodes: string[] = [];
  if (components.length > 1) {
    components.sort((a, b) => b.length - a.length);
    for (let i = 1; i < components.length; i++) {
      disconnectedNodes.push(...components[i]);
    }
  }

  const summary: CalculationSummary = {
    total_cables_routed: totalRouted,
    unrouted_cables: unroutedCables,
    total_branches: branches.length,
    max_fill_branch_id: maxFillBranchId,
    max_fill_pct: Number(maxFillPct.toFixed(1)),
    total_cable_length_routed_m: Number(totalCableLengthRouted.toFixed(2)),
    total_tray_length_m: Number(totalTrayLength.toFixed(2)),
    overfilled_branches_count: overfilledCount,
  };

  const diagnostics: Diagnostics = {
    disconnected_nodes: disconnectedNodes.sort(),
    missing_nodes_referenced_in_cables: Array.from(missingNodes).sort(),
    unrouted_cables_details: cableRoutingResults.filter(c => c.status === 'UNROUTED'),
  };

  const calculatedNodes = calculateNetworkNodeFittings(
    branches,
    branchResults,
    nodeConfigs,
    parameters.default_tray_height_mm
  );

  const bom = generateBillOfMaterialsClient(parameters, branchResults, cableRoutingResults, calculatedNodes);

  return {
    summary,
    branches: branchResults,
    cables: cableRoutingResults,
    diagnostics,
    bom,
    nodes: calculatedNodes,
  };
}

export function generateBillOfMaterialsClient(
  parameters: CalculationParameters,
  branches: BranchSizingResult[],
  cables: CableRoutingResult[],
  nodeFittings?: CalculatedNodeFitting[]
): BillOfMaterials {
  const trayGroups = new Map<string, {
    width_mm: number;
    height_mm: number;
    branch_type: 'horizontal' | 'vertical';
    total_length_m: number;
    branch_count: number;
  }>();

  let totalTrayLen = 0;
  let totalSections = 0;

  branches.forEach(b => {
    const type = (b.branch_type.toLowerCase().includes('vert') || b.branch_type.toLowerCase().includes('riser')) ? 'vertical' : 'horizontal';
    const key = `${b.recommended_commercial_width_mm}_${b.tray_height_mm}_${type}`;
    if (!trayGroups.has(key)) {
      trayGroups.set(key, {
        width_mm: b.recommended_commercial_width_mm,
        height_mm: b.tray_height_mm,
        branch_type: type,
        total_length_m: 0,
        branch_count: 0,
      });
    }
    const item = trayGroups.get(key)!;
    item.total_length_m += b.length_m;
    item.branch_count += 1;
    totalTrayLen += b.length_m;
  });

  const trayItems: TrayBomItem[] = Array.from(trayGroups.values())
    .map(data => {
      const secCount = data.total_length_m > 0 ? Math.ceil(data.total_length_m / 3.0) : 0;
      totalSections += secCount;
      return {
        width_mm: data.width_mm,
        height_mm: data.height_mm,
        branch_type: data.branch_type,
        total_length_m: Number(data.total_length_m.toFixed(2)),
        section_count_3m: secCount,
        branch_count: data.branch_count,
      };
    })
    .sort((a, b) => a.width_mm - b.width_mm || a.branch_type.localeCompare(b.branch_type));

  const totalJoints = branches.reduce((sum, b) => sum + Math.max(0, Math.ceil(b.length_m / 3.0) - 1), 0);
  const totalConnectionJoints = branches.length > 0 ? Math.max(branches.length, totalJoints + branches.length) : 0;
  const couplerQty = totalConnectionJoints * 2;
  const hardwareBoltsQty = couplerQty * 4;
  const supportQty = branches.reduce((sum, b) => sum + Math.max(1, Math.ceil(b.length_m / 1.5)), 0);

  const accessories: AccessoryBomItem[] = [
    {
      item_name: 'Straight Splice Coupler Plates',
      category: 'Coupler',
      description: 'Galvanized steel side-rail coupler plates (2 per standard 3m joint/connection)',
      quantity: couplerQty,
      unit: 'pcs',
    },
    {
      item_name: 'Joint Hardware Sets (M8x20 Bolts & Flange Nuts)',
      category: 'Hardware',
      description: 'High-tensile zinc-plated fasteners for coupler plates (4 bolts per plate)',
      quantity: hardwareBoltsQty,
      unit: 'sets',
    },
    {
      item_name: 'Trapeze Hanger Supports / Cantilever Brackets',
      category: 'Support',
      description: 'Structural heavy-duty ceiling/wall support assemblies spaced @ 1.5m intervals',
      quantity: supportQty,
      unit: 'pcs',
    },
  ];

  if (parameters.add_metallic_divider && branches.length > 0) {
    const dividerLen = branches.reduce((sum, b) => {
      if (b.power_cables_count > 0 && (b.control_cables_count + b.data_cables_count) > 0) {
        return sum + b.length_m;
      }
      return sum;
    }, 0);

    if (dividerLen > 0) {
      accessories.push({
        item_name: `Perforated Metallic Barrier Divider (${parameters.divider_width_mm}mm)`,
        category: 'Divider',
        description: 'Continuous EMI metallic segregation strip (3.0m sections) for separating power & control',
        quantity: Math.ceil(dividerLen / 3.0),
        unit: 'pcs (3m)',
      });
    }
  }

  const cableGroups = new Map<string, { cable_type: string; cable_count: number; total_routed_length_m: number }>();
  let totalCableLen = 0;

  cables.forEach(c => {
    if (c.status !== 'ROUTED') return;
    const cType = c.cable_type.trim();
    if (!cableGroups.has(cType)) {
      cableGroups.set(cType, { cable_type: cType, cable_count: 0, total_routed_length_m: 0 });
    }
    const g = cableGroups.get(cType)!;
    const run = c.total_length_m * c.count;
    g.cable_count += c.count;
    g.total_routed_length_m += run;
    totalCableLen += run;
  });

  const cablesSummary: CableBomItem[] = Array.from(cableGroups.values())
    .map(g => ({
      cable_type: g.cable_type,
      cable_count: g.cable_count,
      total_routed_length_m: Number(g.total_routed_length_m.toFixed(2)),
      avg_length_m: g.cable_count > 0 ? Number((g.total_routed_length_m / g.cable_count).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.cable_type.localeCompare(b.cable_type));

  const { fittings, reducers } = generateFittingsAndReducersBom(nodeFittings || []);
  const totalFittingsCount = fittings.reduce((sum, f) => sum + f.quantity, 0);
  const totalReducersCount = reducers.reduce((sum, r) => sum + r.quantity, 0);

  return {
    trays: trayItems,
    accessories,
    cables_summary: cablesSummary,
    fittings,
    reducers,
    total_tray_length_m: Number(totalTrayLen.toFixed(2)),
    total_sections_3m: totalSections,
    total_cable_length_m: Number(totalCableLen.toFixed(2)),
    total_fittings_count: totalFittingsCount,
    total_reducers_count: totalReducersCount,
  };
}
