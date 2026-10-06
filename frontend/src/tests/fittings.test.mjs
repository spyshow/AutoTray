import test from 'node:test';
import assert from 'node:assert/strict';

export const FITTING_TYPE_NAMES = {
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
  skewed_downward_bend: 'Right Downward Skewed Bend',
  electrical_board_outlet: 'Electrical Board Outlet / Drop Flange',
  straight_coupler: 'Straight Splice Coupler',
  closed_bend: 'Closed Bend / Terminal End',
  end_cap: 'End Cap / Terminal Drop',
  none: 'None / Pass-Through',
};

export function detectDefaultFittingType(connected) {
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

export function calculateNetworkNodeFittings(branches, branchResults, userConfigs, defaultTrayHeightMm = 60) {
  const sizingMap = new Map();
  if (branchResults) {
    branchResults.forEach(r => sizingMap.set(r.branch_id, r));
  }

  const nodeBranchesMap = new Map();
  const nodeLevelsMap = new Map();

  branches.forEach(b => {
    const from = b.node_from?.trim();
    const to = b.node_to?.trim();
    const result = sizingMap.get(b.branch_id);
    const width = result?.recommended_commercial_width_mm || 100;
    const height = b.tray_height_mm || defaultTrayHeightMm || 60;

    const branchInfo = {
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
      nodeBranchesMap.get(from).push(branchInfo);
      nodeLevelsMap.get(from).add(b.level || 'Level 1');
    }

    if (to && to !== from) {
      if (!nodeBranchesMap.has(to)) {
        nodeBranchesMap.set(to, []);
        nodeLevelsMap.set(to, new Set());
      }
      nodeBranchesMap.get(to).push(branchInfo);
      nodeLevelsMap.get(to).add(b.level || 'Level 1');
    }
  });

  const calculatedNodes = [];

  Array.from(nodeBranchesMap.entries()).forEach(([nodeId, connected]) => {
    const levels = Array.from(nodeLevelsMap.get(nodeId) || ['Level 1']);
    const levelDisplay = levels.join(' / ');

    const detectedType = detectDefaultFittingType(connected);
    const userCfg = userConfigs ? userConfigs[nodeId] : undefined;
    const selectedType = userCfg?.fitting_type || detectedType;
    const userOverride = Boolean(userCfg?.user_override && userCfg.fitting_type);

    const maxWidth = connected.reduce((max, b) => Math.max(max, b.width_mm), 100);
    const maxHeight = connected.reduce((max, b) => Math.max(max, b.height_mm), defaultTrayHeightMm);

    const reducers = {};

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
      notes: userCfg?.notes,
    });
  });

  return calculatedNodes.sort((a, b) => a.node_id.localeCompare(b.node_id, undefined, { numeric: true }));
}

export function generateFittingsAndReducersBom(nodes) {
  const fittingGroups = new Map();
  const reducerGroups = new Map();

  nodes.forEach(node => {
    if (node.selected_fitting_type !== 'none') {
      const fType = node.selected_fitting_type;
      const key = `${fType}_${node.width_mm}_${node.height_mm}`;
      const fName = FITTING_TYPE_NAMES[fType] || fType;

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

      const g = fittingGroups.get(key).item;
      g.quantity += 1;
      g.nodes.push(node.node_id);
    }

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

        const rg = reducerGroups.get(rKey).item;
        rg.quantity += 1;
        rg.locations.push({ node_id: node.node_id, branch_id: r.branch_id });
      }
    });
  });

  const fittings = Array.from(fittingGroups.values())
    .map(g => g.item)
    .sort((a, b) => b.width_mm - a.width_mm || a.fitting_name.localeCompare(b.fitting_name));

  const reducers = Array.from(reducerGroups.values())
    .map(g => g.item)
    .sort((a, b) => b.from_width_mm - a.from_width_mm || b.to_width_mm - a.to_width_mm);

  return { fittings, reducers };
}

test('Fittings Heuristic: detects fitting type by branch count and orientation', () => {
  // 1 branch -> End Cap
  assert.equal(detectDefaultFittingType([{ branch_id: 'B1', node_from: 'N1', node_to: 'N2', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 }]), 'end_cap');

  // 2 horizontal branches on same level -> 90° Elbow
  assert.equal(detectDefaultFittingType([
    { branch_id: 'B1', node_from: 'N1', node_to: 'N2', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
    { branch_id: 'B2', node_from: 'N2', node_to: 'N3', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
  ]), 'horizontal_elbow_90');

  // 2 branches with vertical riser -> Vertical Riser Bend
  assert.equal(detectDefaultFittingType([
    { branch_id: 'B1', node_from: 'N1', node_to: 'N2', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
    { branch_id: 'B2', node_from: 'N2', node_to: 'N3', level: 'L2', branch_type: 'vertical', width_mm: 300, height_mm: 60, length_m: 5 },
  ]), 'vertical_inside_riser');

  // 3 branches -> Horizontal Tee
  assert.equal(detectDefaultFittingType([
    { branch_id: 'B1', node_from: 'N1', node_to: 'N2', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
    { branch_id: 'B2', node_from: 'N2', node_to: 'N3', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
    { branch_id: 'B3', node_from: 'N2', node_to: 'N4', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
  ]), 'horizontal_tee');

  // 4 branches -> Horizontal Cross
  assert.equal(detectDefaultFittingType([
    { branch_id: 'B1', node_from: 'N1', node_to: 'N2', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
    { branch_id: 'B2', node_from: 'N2', node_to: 'N3', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
    { branch_id: 'B3', node_from: 'N2', node_to: 'N4', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
    { branch_id: 'B4', node_from: 'N2', node_to: 'N5', level: 'L1', branch_type: 'horizontal', width_mm: 300, height_mm: 60, length_m: 5 },
  ]), 'horizontal_cross');
});

test('Node Sizing & Reducers: adapts fitting to max branch width and calculates reducers for narrower branches', () => {
  const branches = [
    { branch_id: 'BR_A', node_from: 'NODE_1', node_to: 'NODE_2', level: 'Level 1', branch_type: 'horizontal', length_m: 10, tray_height_mm: 60 },
    { branch_id: 'BR_B', node_from: 'NODE_1', node_to: 'NODE_3', level: 'Level 1', branch_type: 'horizontal', length_m: 10, tray_height_mm: 60 },
    { branch_id: 'BR_C', node_from: 'NODE_1', node_to: 'NODE_4', level: 'Level 1', branch_type: 'horizontal', length_m: 10, tray_height_mm: 60 },
  ];

  const branchResults = [
    { branch_id: 'BR_A', recommended_commercial_width_mm: 400, tray_height_mm: 60 },
    { branch_id: 'BR_B', recommended_commercial_width_mm: 400, tray_height_mm: 60 },
    { branch_id: 'BR_C', recommended_commercial_width_mm: 200, tray_height_mm: 60 },
  ];

  const nodes = calculateNetworkNodeFittings(branches, branchResults, null, 60);

  const node1 = nodes.find(n => n.node_id === 'NODE_1');
  assert.ok(node1, 'NODE_1 should be extracted');
  assert.equal(node1.detected_fitting_type, 'horizontal_tee');
  assert.equal(node1.selected_fitting_type, 'horizontal_tee');
  assert.equal(node1.width_mm, 400, 'Fitting width must adapt to max width (400mm)');
  assert.equal(node1.height_mm, 60);

  // Reducer checks: BR_C (200mm) < 400mm, so it needs a 400mm -> 200mm reducer
  assert.equal(Object.keys(node1.reducers).length, 1);
  const redC = node1.reducers['BR_C'];
  assert.ok(redC, 'BR_C should have an auto-calculated reducer');
  assert.equal(redC.from_width_mm, 400);
  assert.equal(redC.to_width_mm, 200);
  assert.equal(redC.reducer_type, 'concentric');
  assert.equal(redC.enabled, true);

  // BOM Generation
  const { fittings, reducers } = generateFittingsAndReducersBom(nodes);
  const tee = fittings.find(f => f.fitting_type === 'horizontal_tee');
  assert.ok(tee, 'Horizontal Tee should be present in fittings BOM');
  assert.equal(tee.width_mm, 400);
  assert.equal(tee.quantity, 1);

  const red = reducers.find(r => r.from_width_mm === 400 && r.to_width_mm === 200);
  assert.ok(red, '400->200 Reducer should be present in reducers BOM');
  assert.equal(red.quantity, 1);
  assert.equal(red.reducer_type, 'concentric');
});

test('User Overrides: Preserves manual fitting type, toggled reducers, and eccentric geometry', () => {
  const branches = [
    { branch_id: 'BR_A', node_from: 'NODE_X', node_to: 'NODE_Y', level: 'Level 1', branch_type: 'horizontal', length_m: 10, tray_height_mm: 60 },
    { branch_id: 'BR_B', node_from: 'NODE_X', node_to: 'NODE_Z', level: 'Level 1', branch_type: 'horizontal', length_m: 10, tray_height_mm: 60 },
  ];
  const branchResults = [
    { branch_id: 'BR_A', recommended_commercial_width_mm: 300, tray_height_mm: 60 },
    { branch_id: 'BR_B', recommended_commercial_width_mm: 150, tray_height_mm: 60 },
  ];

  const userConfigs = {
    NODE_X: {
      node_id: 'NODE_X',
      fitting_type: 'horizontal_elbow_45',
      user_override: true,
      reducers: {
        BR_B: {
          branch_id: 'BR_B',
          from_width_mm: 300,
          to_width_mm: 150,
          height_mm: 60,
          reducer_type: 'eccentric_left',
          enabled: false, // User disabled the reducer
        },
      },
    },
  };

  const nodes = calculateNetworkNodeFittings(branches, branchResults, userConfigs, 60);
  const nodeX = nodes.find(n => n.node_id === 'NODE_X');
  assert.ok(nodeX);
  assert.equal(nodeX.selected_fitting_type, 'horizontal_elbow_45');
  assert.equal(nodeX.user_override, true);
  assert.equal(nodeX.reducers['BR_B'].reducer_type, 'eccentric_left');
  assert.equal(nodeX.reducers['BR_B'].enabled, false);

  // Because the reducer is disabled, it should NOT appear in BOM
  const { reducers } = generateFittingsAndReducersBom(nodes);
  const redB = reducers.find(r => r.from_width_mm === 300 && r.to_width_mm === 150);
  assert.equal(redB, undefined, 'Disabled reducer must not be included in BOM');
});
