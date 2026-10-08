import {
  Branch,
  BranchSizingResult,
  FittingType,
  ReducerType,
  NodePortReducer,
  NodeFittingConfig,
  ConnectedBranchInfo,
  CalculatedNodeFitting,
  FittingBomItem,
  ReducerBomItem,
} from './types';

export const FITTING_TYPE_NAMES: Record<FittingType, string> = {
  horizontal_tee: 'Equal Tee (Horizontal Tee)',
  horizontal_half_tee: 'Half Equal Tee (Offset Branch)',
  horizontal_cross: 'Crosspiece (4-Way Cross)',
  horizontal_elbow_90: '90° Flat Bend (Horizontal 90°)',
  horizontal_elbow_45: '45° Flat Bend (Horizontal 45°)',
  vertical_inside_riser: '90° Inside Riser Bend (Upward)',
  vertical_outside_riser: '90° Outside Riser Bend (Downward)',
  vertical_inside_riser_45: '45° Inside Riser Bend (Upward)',
  vertical_outside_riser_45: '45° Outside Riser Bend (Downward)',
  vertical_downward_tee: 'Vertical Downward Skewed Tee',
  vertical_upward_tee: 'Vertical Upward Skewed Tee',
  skewed_downward_bend: 'Right Downward Skewed Bend',
  electrical_board_outlet: 'Electrical Board Outlet / Drop Flange',
  straight_coupler: 'Straight Splice Coupler',
  closed_bend: 'Closed Bend / Terminal End',
  end_cap: 'End Cap / Terminal Drop',
  none: 'None / Pass-Through',
};

export const REDUCER_TYPE_NAMES: Record<ReducerType, string> = {
  concentric: 'Concentric Reducer',
  eccentric_left: 'Left Reducer (Flat Left Rail)',
  eccentric_right: 'Right Reducer (Flat Right Rail)',
  height_reducer: 'Height Reducer (Flange Step)',
};

/**
 * Checks whether a fitting is a 45° bend which requires pairs (x2) in standard installation.
 */
export function is45DegFitting(type: FittingType): boolean {
  return (
    type === 'horizontal_elbow_45' ||
    type === 'vertical_inside_riser_45' ||
    type === 'vertical_outside_riser_45'
  );
}

/**
 * Heuristically detects the fitting type based on the connected branches at a node.
 */
export function detectDefaultFittingType(connected: ConnectedBranchInfo[]): FittingType {
  const count = connected.length;
  if (count === 0) return 'none';
  if (count === 1) return 'end_cap';
  if (count === 2) {
    const hasVertical = connected.some(b => b.branch_type === 'vertical');
    const hasHorizontal = connected.some(b => b.branch_type === 'horizontal');
    const levels = new Set(connected.map(b => b.level));
    if ((hasVertical && hasHorizontal) || levels.size > 1) {
      return 'vertical_inside_riser';
    }
    return 'horizontal_elbow_90';
  }
  if (count === 3) return 'horizontal_tee';
  return 'horizontal_cross';
}

/**
 * Extracts and calculates all network nodes, sizing their fittings to the widest connected branch,
 * and identifying ports that require reducers.
 */
export function calculateNetworkNodeFittings(
  branches: Branch[],
  branchResults?: BranchSizingResult[] | null,
  userConfigs?: Record<string, NodeFittingConfig> | null,
  defaultTrayHeightMm: number = 60
): CalculatedNodeFitting[] {
  // Map branch sizing results for fast lookup
  const sizingMap = new Map<string, BranchSizingResult>();
  if (branchResults) {
    branchResults.forEach(r => sizingMap.set(r.branch_id, r));
  }

  // Group connected branches by node
  const nodeBranchesMap = new Map<string, ConnectedBranchInfo[]>();
  const nodeLevelsMap = new Map<string, Set<string>>();

  branches.forEach(b => {
    const from = b.node_from?.trim();
    const to = b.node_to?.trim();
    const result = sizingMap.get(b.branch_id);
    const width = result?.recommended_commercial_width_mm || 100;
    const height = b.tray_height_mm || defaultTrayHeightMm || 60;

    const branchInfo: ConnectedBranchInfo = {
      branch_id: b.branch_id,
      node_from: from,
      node_to: to,
      level: b.level || 'Level 1',
      branch_type: b.branch_type || 'horizontal',
      width_mm: width,
      height_mm: height,
      length_m: b.length_m || 0,
    };

    if (from) {
      if (!nodeBranchesMap.has(from)) {
        nodeBranchesMap.set(from, []);
        nodeLevelsMap.set(from, new Set());
      }
      nodeBranchesMap.get(from)!.push(branchInfo);
      nodeLevelsMap.get(from)!.add(b.level || 'Level 1');
    }

    if (to && to !== from) {
      if (!nodeBranchesMap.has(to)) {
        nodeBranchesMap.set(to, []);
        nodeLevelsMap.set(to, new Set());
      }
      nodeBranchesMap.get(to)!.push(branchInfo);
      nodeLevelsMap.get(to)!.add(b.level || 'Level 1');
    }
  });

  const calculatedNodes: CalculatedNodeFitting[] = [];

  Array.from(nodeBranchesMap.entries()).forEach(([nodeId, connected]) => {
    const levels = Array.from(nodeLevelsMap.get(nodeId) || ['Level 1']);
    const levelDisplay = levels.join(' / ');

    const detectedType = detectDefaultFittingType(connected);
    const userCfg = userConfigs ? userConfigs[nodeId] : undefined;
    const selectedType = userCfg?.fitting_type || detectedType;
    const userOverride = Boolean(userCfg?.user_override && userCfg.fitting_type);

    // Fitting nominal width adapts to the widest connected branch
    const maxWidth = connected.reduce((max, b) => Math.max(max, b.width_mm), 100);
    const maxHeight = connected.reduce((max, b) => Math.max(max, b.height_mm), defaultTrayHeightMm);

    // Compute port reducers for any branch narrower than maxWidth
    const reducers: Record<string, NodePortReducer> = {};

    connected.forEach(b => {
      if (b.width_mm < maxWidth && selectedType !== 'none') {
        const savedReducer = userCfg?.reducers?.[b.branch_id];
        reducers[b.branch_id] = {
          branch_id: b.branch_id,
          from_width_mm: maxWidth,
          to_width_mm: b.width_mm,
          height_mm: maxHeight,
          reducer_type: savedReducer?.reducer_type || 'concentric',
          enabled: savedReducer !== undefined ? savedReducer.enabled : true,
        };
      }
    });

    const is45 = is45DegFitting(selectedType);
    const defaultQty = is45 ? 2 : 1;
    const qtyMultiplier = userCfg?.quantity_multiplier !== undefined ? userCfg.quantity_multiplier : defaultQty;

    calculatedNodes.push({
      node_id: nodeId,
      level: levelDisplay,
      connected_branches: connected,
      detected_fitting_type: detectedType,
      selected_fitting_type: selectedType,
      user_override: userOverride,
      width_mm: maxWidth,
      height_mm: maxHeight,
      reducers,
      include_cover: userCfg?.include_cover,
      quantity_multiplier: qtyMultiplier,
      notes: userCfg?.notes,
    });
  });

  return calculatedNodes.sort((a, b) =>
    a.node_id.localeCompare(b.node_id, undefined, { numeric: true }) || a.node_id.localeCompare(b.node_id)
  );
}

/**
 * Aggregates all configured node fittings and active reducers into BOM items.
 */
export function generateFittingsAndReducersBom(nodes: CalculatedNodeFitting[]): {
  fittings: FittingBomItem[];
  reducers: ReducerBomItem[];
} {
  const fittingGroups = new Map<string, { item: FittingBomItem }>();
  const reducerGroups = new Map<string, { item: ReducerBomItem }>();

  nodes.forEach(node => {
    // Only add fittings that are physical components (exclude none)
    if (node.selected_fitting_type !== 'none') {
      const fType = node.selected_fitting_type;
      const key = `${fType}_${node.width_mm}_${node.height_mm}`;
      const fName = FITTING_TYPE_NAMES[fType] || fType;
      const multiplier = node.quantity_multiplier !== undefined ? node.quantity_multiplier : (is45DegFitting(fType) ? 2 : 1);

      if (!fittingGroups.has(key)) {
        fittingGroups.set(key, {
          item: {
            fitting_type: fType,
            fitting_name: fName,
            width_mm: node.width_mm,
            height_mm: node.height_mm,
            quantity: 0,
            nodes: [],
          },
        });
      }

      const g = fittingGroups.get(key)!.item;
      g.quantity += multiplier;
      g.nodes.push(node.node_id);
    }

    // Process active reducers for this node
    Object.values(node.reducers).forEach(r => {
      if (r.enabled && r.from_width_mm > r.to_width_mm) {
        const rKey = `${r.from_width_mm}_${r.to_width_mm}_${r.height_mm}_${r.reducer_type}`;
        if (!reducerGroups.has(rKey)) {
          reducerGroups.set(rKey, {
            item: {
              from_width_mm: r.from_width_mm,
              to_width_mm: r.to_width_mm,
              height_mm: r.height_mm,
              reducer_type: r.reducer_type,
              quantity: 0,
              locations: [],
            },
          });
        }

        const rg = reducerGroups.get(rKey)!.item;
        rg.quantity += 1;
        rg.locations.push({ node_id: node.node_id, branch_id: r.branch_id });
      }
    });
  });

  const fittings: FittingBomItem[] = Array.from(fittingGroups.values())
    .map(g => g.item)
    .sort((a, b) => b.width_mm - a.width_mm || a.fitting_name.localeCompare(b.fitting_name));

  const reducers: ReducerBomItem[] = Array.from(reducerGroups.values())
    .map(g => g.item)
    .sort((a, b) => b.from_width_mm - a.from_width_mm || b.to_width_mm - a.to_width_mm);

  return { fittings, reducers };
}
