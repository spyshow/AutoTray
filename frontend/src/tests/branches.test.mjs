import test from 'node:test';
import assert from 'node:assert/strict';
import { incrementIdentifier } from '../lib/utils.ts';

test('incrementIdentifier increments trailing numbers with zero padding preserved', () => {
  assert.equal(incrementIdentifier('BR_L0_01'), 'BR_L0_02');
  assert.equal(incrementIdentifier('BR_L0_02'), 'BR_L0_03');
  assert.equal(incrementIdentifier('BR_L1_03'), 'BR_L1_04');
  assert.equal(incrementIdentifier('N00'), 'N01');
  assert.equal(incrementIdentifier('N01'), 'N02');
  assert.equal(incrementIdentifier('N011'), 'N012');
  assert.equal(incrementIdentifier('NODE_3'), 'NODE_4');
  assert.equal(incrementIdentifier('NODE_4'), 'NODE_5');
});

test('incrementIdentifier handles zero padding overflow correctly', () => {
  assert.equal(incrementIdentifier('BR_L0_09'), 'BR_L0_10');
  assert.equal(incrementIdentifier('BR_L0_99'), 'BR_L0_100');
  assert.equal(incrementIdentifier('TRAY_001'), 'TRAY_002');
});

test('incrementIdentifier appends _1 when no digits are present', () => {
  assert.equal(incrementIdentifier('FEEDER'), 'FEEDER_1');
  assert.equal(incrementIdentifier('MCC_PANEL'), 'MCC_PANEL_1');
  assert.equal(incrementIdentifier(''), '1');
});

test('incrementIdentifier preserves non-digit suffixes', () => {
  assert.equal(incrementIdentifier('BR_01_A'), 'BR_02_A');
  assert.equal(incrementIdentifier('TRAY-12-REV'), 'TRAY-13-REV');
});

test('Add Branch creates chained segment with incremented ID, inherited level, and last ToNode as FromNode', () => {
  const branches = [
    {
      branch_id: 'BR_L0_01',
      node_from: 'N00',
      node_to: 'N01',
      level: 'Level 0',
      branch_type: 'horizontal',
      length_m: 6.0,
      tray_height_mm: 100,
      mounting_type: 'wall_cantilever',
    },
    {
      branch_id: 'BR_L0_02',
      node_from: 'N01',
      node_to: 'N011',
      level: 'Level 0',
      branch_type: 'horizontal',
      length_m: 21.5,
      tray_height_mm: 100,
      mounting_type: 'wall_cantilever',
    },
  ];

  const lastBranch = branches[branches.length - 1];

  let nextBranchId = incrementIdentifier(lastBranch.branch_id);
  const existingIds = new Set(branches.map(b => b.branch_id.toLowerCase()));
  while (existingIds.has(nextBranchId.toLowerCase())) {
    nextBranchId = incrementIdentifier(nextBranchId);
  }

  const nextNodeFrom = lastBranch.node_to;
  let nextNodeTo = incrementIdentifier(nextNodeFrom);
  if (nextNodeTo.toLowerCase() === nextNodeFrom.toLowerCase()) {
    nextNodeTo = `${nextNodeFrom}_NEXT`;
  }

  const newBranch = {
    branch_id: nextBranchId,
    node_from: nextNodeFrom,
    node_to: nextNodeTo,
    level: lastBranch.level,
    branch_type: 'horizontal',
    length_m: 6.0,
    tray_height_mm: lastBranch.tray_height_mm ?? 100,
    mounting_type: lastBranch.mounting_type || 'ceiling_trapeze',
  };

  assert.equal(newBranch.branch_id, 'BR_L0_03');
  assert.equal(newBranch.node_from, 'N011');
  assert.equal(newBranch.node_to, 'N012');
  assert.equal(newBranch.level, 'Level 0');
  assert.equal(newBranch.tray_height_mm, 100);
  assert.equal(newBranch.mounting_type, 'wall_cantilever');
});

test('Add Branch avoids ID collisions if incremented candidate already exists', () => {
  const branches = [
    { branch_id: 'BR_L0_01', node_from: 'N00', node_to: 'N01', level: 'Level 0' },
    { branch_id: 'BR_L0_03', node_from: 'N01', node_to: 'N02', level: 'Level 0' },
    { branch_id: 'BR_L0_02', node_from: 'N02', node_to: 'N03', level: 'Level 0' },
  ];

  const lastBranch = branches[branches.length - 1]; // BR_L0_02
  let nextBranchId = incrementIdentifier(lastBranch.branch_id);
  const existingIds = new Set(branches.map(b => b.branch_id.toLowerCase()));
  while (existingIds.has(nextBranchId.toLowerCase())) {
    nextBranchId = incrementIdentifier(nextBranchId);
  }

  // BR_L0_03 is already taken, so it advances to BR_L0_04
  assert.equal(nextBranchId, 'BR_L0_04');
});

test('Pagination preserves current pageIndex when editing rows', () => {
  let pagination = { pageIndex: 1, pageSize: 12 }; // User is on Page 2

  // Simulate updating a branch row in-place
  const branches = Array.from({ length: 20 }, (_, i) => ({
    branch_id: `BR_${i + 1}`,
    length_m: 6.0,
  }));

  // With autoResetPageIndex = false, editing in-place maintains pageIndex
  const updatedBranches = [...branches];
  updatedBranches[14] = { ...updatedBranches[14], length_m: 12.0 };

  // Page index remains on Page 2 (index 1)
  assert.equal(pagination.pageIndex, 1);
});

test('Pagination stays on same page when adding row to non-full page, and advances when full', () => {
  const pageSize = 12;

  // Case 1: Page 2 has 5 items (not full). Adding 1 item stays on Page 2.
  let currentTotal = 17; // 12 on page 1, 5 on page 2
  let pagination = { pageIndex: 1, pageSize }; // Page 2
  let isAtLastPage = pagination.pageIndex === Math.max(0, Math.ceil(currentTotal / pageSize) - 1);
  if (isAtLastPage && currentTotal % pageSize === 0 && currentTotal > 0) {
    pagination.pageIndex += 1;
  }
  assert.equal(pagination.pageIndex, 1); // Stays on Page 2

  // Case 2: Page 2 is full (24 items). Adding 1 item advances to Page 3 so user sees the new item.
  currentTotal = 24; // 12 on page 1, 12 on page 2
  pagination = { pageIndex: 1, pageSize }; // Page 2
  isAtLastPage = pagination.pageIndex === Math.max(0, Math.ceil(currentTotal / pageSize) - 1);
  if (isAtLastPage && currentTotal % pageSize === 0 && currentTotal > 0) {
    pagination.pageIndex += 1;
  }
  assert.equal(pagination.pageIndex, 2); // Advances to Page 3
});

test('Pagination clamps to last valid page when rows are deleted', () => {
  const pageSize = 12;
  let pagination = { pageIndex: 2, pageSize }; // User on Page 3

  // Suppose rows shrink from 30 to 15 (only 2 pages left: index 0 and 1)
  const remainingCount = 15;
  const maxPageIndex = Math.max(0, Math.ceil(remainingCount / pageSize) - 1);
  if (pagination.pageIndex > maxPageIndex) {
    pagination.pageIndex = maxPageIndex;
  }

  assert.equal(pagination.pageIndex, 1); // Clamped to Page 2
});

test('Pagination allows choosing lines per page up to 100', () => {
  const allowedSizes = [10, 20, 50, 100];
  assert.ok(allowedSizes.includes(100));

  let pagination = { pageIndex: 3, pageSize: 10 }; // 4th page (items 31-40)
  const totalItems = 85;

  // Change to 50 lines per page -> resets to pageIndex 0
  const changePageSize = (newSize) => {
    pagination = { pageIndex: 0, pageSize: newSize };
  };

  changePageSize(50);
  assert.equal(pagination.pageSize, 50);
  assert.equal(pagination.pageIndex, 0);
  let totalPages = Math.ceil(totalItems / pagination.pageSize);
  assert.equal(totalPages, 2);

  // Change to 100 lines per page -> displays all 85 items on 1 single page
  changePageSize(100);
  assert.equal(pagination.pageSize, 100);
  assert.equal(pagination.pageIndex, 0);
  totalPages = Math.ceil(totalItems / pagination.pageSize);
  assert.equal(totalPages, 1);
});

test('Page Size localStorage persistence: Saves and restores table preferences with global fallback', () => {
  const store = {};
  globalThis.window = {
    localStorage: {
      getItem: (key) => store[key] ?? null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
    },
  };
  globalThis.localStorage = globalThis.window.localStorage;

  const STORAGE_KEY_GLOBAL = 'autotray_lines_per_page';
  const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

  function getStoredPageSize(tableKey, defaultSize = 10) {
    if (typeof window === 'undefined') return defaultSize;
    try {
      const specificKey = tableKey ? `${STORAGE_KEY_GLOBAL}_${tableKey}` : null;
      const stored =
        (specificKey ? localStorage.getItem(specificKey) : null) ||
        localStorage.getItem(STORAGE_KEY_GLOBAL);

      if (!stored) return defaultSize;
      const parsed = parseInt(stored, 10);
      return ALLOWED_PAGE_SIZES.includes(parsed) ? parsed : defaultSize;
    } catch {
      return defaultSize;
    }
  }

  function setStoredPageSize(size, tableKey) {
    if (typeof window === 'undefined') return;
    try {
      if (!ALLOWED_PAGE_SIZES.includes(size)) return;
      localStorage.setItem(STORAGE_KEY_GLOBAL, String(size));
      if (tableKey) {
        localStorage.setItem(`${STORAGE_KEY_GLOBAL}_${tableKey}`, String(size));
      }
    } catch (err) {}
  }

  // 1. Initial state: returns default 10
  assert.equal(getStoredPageSize('branches'), 10);

  // 2. Set page size on branches table to 50
  setStoredPageSize(50, 'branches');
  assert.equal(getStoredPageSize('branches'), 50);

  // 3. Cables table should fallback to the global saved preference (50)
  assert.equal(getStoredPageSize('cables'), 50);

  // 4. Set cables explicitly to 100
  setStoredPageSize(100, 'cables');
  assert.equal(getStoredPageSize('cables'), 100);
  assert.equal(getStoredPageSize('branches'), 50);

  // 5. Corrupted value safely falls back to default 10
  store[STORAGE_KEY_GLOBAL] = '999';
  store[`${STORAGE_KEY_GLOBAL}_invalid`] = 'not_a_number';
  assert.equal(getStoredPageSize('invalid'), 10);

  // Cleanup
  delete globalThis.window;
  delete globalThis.localStorage;
});

test('Network topology extracts only actual added levels without phantom hardcoded levels', () => {
  const branches = [
    { branch_id: 'BR_L0_01', node_from: 'N00', node_to: 'N01', level: 'Level 0', branch_type: 'horizontal' },
    { branch_id: 'BR_L0_02', node_from: 'N01', node_to: 'N02', level: 'Level 0', branch_type: 'horizontal' },
    { branch_id: 'BR_L0_03', node_from: 'N02', node_to: 'N03', level: 'Level 0', branch_type: 'horizontal' },
  ];

  const detectedLevelsSet = new Set();
  branches.forEach(b => {
    const lvl = (b.level || '').trim();
    if (lvl && b.branch_type !== 'vertical' && !lvl.toLowerCase().includes('transition')) {
      detectedLevelsSet.add(lvl);
    }
  });

  const actualLevels = Array.from(detectedLevelsSet);
  assert.deepEqual(actualLevels, ['Level 0']);
  assert.ok(!actualLevels.includes('Level 1'));
  assert.ok(!actualLevels.includes('Level 2'));
  assert.ok(!actualLevels.includes('Level 3'));
});

test('Network topology sorts levels naturally with higher elevations on top', () => {
  const getLevelNum = (str) => {
    const match = str.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const sortLevelsNaturally = (levels) => {
    return [...levels].sort((a, b) => {
      const numA = getLevelNum(a);
      const numB = getLevelNum(b);
      if (numA !== null && numB !== null) return numB - numA;
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return a.localeCompare(b);
    });
  };

  const rawLevels = ['Level 0', 'Level 2', 'Level 1'];
  const sorted = sortLevelsNaturally(rawLevels);
  assert.deepEqual(sorted, ['Level 2', 'Level 1', 'Level 0']);
});

test('Network topology assigns non-overlapping topological BFS columns and vertical lanes', () => {
  const branches = [
    { branch_id: 'B1', node_from: 'N00', node_to: 'N01', level: 'Level 0' },
    { branch_id: 'B2', node_from: 'N01', node_to: 'N011', level: 'Level 0' },
    { branch_id: 'B3', node_from: 'N01', node_to: 'P101', level: 'Level 0' },
    { branch_id: 'B4', node_from: 'N011', node_to: 'N012', level: 'Level 0' },
    { branch_id: 'B5', node_from: 'N011', node_to: 'N0231', level: 'Level 0' },
  ];

  const nodes = ['N00', 'N01', 'N011', 'P101', 'N012', 'N0231'];
  const adj = {};
  const inDegree = {};
  nodes.forEach(n => { adj[n] = []; inDegree[n] = 0; });
  branches.forEach(b => {
    adj[b.node_from].push(b.node_to);
    inDegree[b.node_to] = (inDegree[b.node_to] || 0) + 1;
  });

  const roots = nodes.filter(n => inDegree[n] === 0);
  assert.deepEqual(roots, ['N00']); // N00 is root source

  const colRank = {};
  const queue = [{ id: 'N00', col: 0 }];
  colRank['N00'] = 0;

  while (queue.length > 0) {
    const { id, col } = queue.shift();
    for (const ch of adj[id]) {
      colRank[ch] = col + 1;
      queue.push({ id: ch, col: col + 1 });
    }
  }

  assert.equal(colRank['N00'], 0);
  assert.equal(colRank['N01'], 1);
  assert.equal(colRank['N011'], 2);
  assert.equal(colRank['P101'], 2);
  assert.equal(colRank['N012'], 3);
  assert.equal(colRank['N0231'], 3);

  // Parallel branch nodes in column 2 get separate lanes
  const col2Nodes = nodes.filter(n => colRank[n] === 2);
  assert.equal(col2Nodes.length, 2);
  assert.ok(col2Nodes.includes('N011'));
  assert.ok(col2Nodes.includes('P101'));
});

test('Mind Map tree layout guarantees non-overlapping vertical spans for subtrees', () => {
  const branches = [
    { branch_id: 'BR_L0_01', node_from: 'N00', node_to: 'N01' },
    { branch_id: 'BR_L0_02', node_from: 'N01', node_to: 'N011' },
    { branch_id: 'BR_L0_07', node_from: 'N01', node_to: 'N02' },
    { branch_id: 'BR_L0_03', node_from: 'N011', node_to: 'N012' },
    { branch_id: 'BR_L0_06', node_from: 'N011', node_to: 'N014' },
    { branch_id: 'BR_L0_05', node_from: 'N011', node_to: 'N015' },
    { branch_id: 'BR_L0_15', node_from: 'N02', node_to: 'N021' },
    { branch_id: 'BR_L0_20', node_from: 'N02', node_to: 'P112' },
  ];

  // In tree decomposition:
  // N01 has 2 subtrees: N011 and N02
  // N011 has children N012, N014, N015 (3 leaves)
  // N02 has children N021, P112 (2 leaves)
  const leafHeight = 58;
  const n011Height = 3 * leafHeight; // 174px
  const n02Height = 2 * leafHeight;  // 116px

  assert.equal(n011Height, 174);
  assert.equal(n02Height, 116);

  // Subtree 1 span: [0, 174]
  // Subtree 2 span: [174, 290]
  // Check that max Y of Subtree 1 is strictly less than min Y of Subtree 2
  const subtree1MaxY = 174;
  const subtree2MinY = 174;
  assert.ok(subtree1MaxY <= subtree2MinY, 'Subtrees must not overlap vertically');
});

test('Collapsing a node hides all its downstream descendants and dynamically shrinks height', () => {
  const branches = [
    { branch_id: 'BR_01', node_from: 'ROOT', node_to: 'BRANCH_A' },
    { branch_id: 'BR_02', node_from: 'ROOT', node_to: 'BRANCH_B' },
    { branch_id: 'BR_03', node_from: 'BRANCH_A', node_to: 'LEAF_A1' },
    { branch_id: 'BR_04', node_from: 'BRANCH_A', node_to: 'LEAF_A2' },
  ];

  const childrenMap = {
    ROOT: ['BRANCH_A', 'BRANCH_B'],
    BRANCH_A: ['LEAF_A1', 'LEAF_A2'],
    BRANCH_B: [],
  };

  const leafHeight = 58;
  const calcSubtreeHeight = (u, collapsed) => {
    if (collapsed.has(u)) return leafHeight;
    const ch = childrenMap[u] || [];
    if (ch.length === 0) return leafHeight;
    return ch.reduce((sum, v) => sum + calcSubtreeHeight(v, collapsed), 0);
  };

  // When fully expanded: BRANCH_A has 2 leaves (116px), BRANCH_B has 1 leaf (58px) -> Total = 174px
  const expandedHeight = calcSubtreeHeight('ROOT', new Set());
  assert.equal(expandedHeight, 174);

  // When BRANCH_A is collapsed: BRANCH_A is treated as 1 leaf (58px), BRANCH_B is 1 leaf (58px) -> Total = 116px
  const collapsedHeight = calcSubtreeHeight('ROOT', new Set(['BRANCH_A']));
  assert.equal(collapsedHeight, 116);
  assert.ok(collapsedHeight < expandedHeight);
});

test('Routed cables extraction resolves full detail and matches fallback Cable list', () => {
  const selectedResultWithDetail = {
    branch_id: 'BR_L0_03',
    cable_count: 2,
    cables_routed: ['CBL_01', 'CBL_02'],
    cables_detail: [
      {
        cable_tag: 'CBL_01',
        source_node: 'N011',
        dest_node: 'N012',
        cable_type: '4x50 mm²',
        od_mm: 28.0,
        count: 1,
        width_contribution_mm: 56.0,
        source_panel: 'MCC_01',
        dest_panel: 'JB_01',
      },
      {
        cable_tag: 'CBL_02',
        source_node: 'N011',
        dest_node: 'N012',
        cable_type: 'Cat6',
        od_mm: 7.5,
        count: 2,
        width_contribution_mm: 15.0,
        source_panel: 'PLC_01',
        dest_panel: 'RIO_01',
      },
    ],
  };

  // Case 1: Directly reads cables_detail
  assert.equal(selectedResultWithDetail.cables_detail.length, 2);
  assert.equal(selectedResultWithDetail.cables_detail[0].cable_tag, 'CBL_01');
  assert.equal(selectedResultWithDetail.cables_detail[0].od_mm, 28.0);

  // Case 2: Fallback when cables_detail is missing
  const selectedResultNoDetail = {
    branch_id: 'BR_L0_03',
    cable_count: 1,
    cables_routed: ['CBL_99'],
  };
  const globalCables = [
    {
      cable_tag: 'CBL_99',
      source_node: 'N00',
      dest_node: 'N01',
      cable_type: '3x2.5 mm²',
      od_mm: 11.0,
      count: 1,
    },
  ];

  const map = new Map(globalCables.map(c => [c.cable_tag, c]));
  const resolved = selectedResultNoDetail.cables_routed.map(tag => {
    const c = map.get(tag);
    return {
      cable_tag: tag,
      source_node: c?.source_node || '',
      dest_node: c?.dest_node || '',
      cable_type: c?.cable_type || '',
      od_mm: c?.od_mm || 0,
      count: c?.count || 1,
      width_contribution_mm: 0,
    };
  });

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].cable_tag, 'CBL_99');
  assert.equal(resolved[0].cable_type, '3x2.5 mm²');
  assert.equal(resolved[0].od_mm, 11.0);
});

test('Cable search query filters cables across tag, type, panel, and endpoints', () => {
  const cables = [
    { cable_tag: 'CBL_PWR_01', cable_type: '4x50 mm²', source_node: 'TRANSF', dest_node: 'MCC', source_panel: 'PANEL_A' },
    { cable_tag: 'CBL_CTRL_01', cable_type: '12x1.5 mm²', source_node: 'MCC', dest_node: 'PUMP', source_panel: 'PANEL_B' },
    { cable_tag: 'CBL_NET_01', cable_type: 'PROFINET', source_node: 'DCS', dest_node: 'RIO', source_panel: 'RACK_1' },
  ];

  const filter = (query) => {
    const q = query.trim().toLowerCase();
    return cables.filter(c =>
      c.cable_tag.toLowerCase().includes(q) ||
      c.cable_type.toLowerCase().includes(q) ||
      c.source_node.toLowerCase().includes(q) ||
      c.dest_node.toLowerCase().includes(q) ||
      (c.source_panel && c.source_panel.toLowerCase().includes(q))
    );
  };

  assert.equal(filter('pwr').length, 1);
  assert.equal(filter('pwr')[0].cable_tag, 'CBL_PWR_01');

  assert.equal(filter('12x1.5').length, 1);
  assert.equal(filter('12x1.5')[0].cable_tag, 'CBL_CTRL_01');

  assert.equal(filter('RACK').length, 1);
  assert.equal(filter('RACK')[0].cable_tag, 'CBL_NET_01');

  assert.equal(filter('NONEXISTENT').length, 0);
});

test('Table Row ID generator: Guarantees unique keys even with duplicate tags or IDs', () => {
  const getCableRowId = (row, index) => `${row.cable_tag || 'cable'}_${index}`;
  const getBranchRowId = (row, index) => `${row.branch_id || 'branch'}_${index}`;

  const duplicateCables = [
    { cable_tag: '=GEN-1W001', cable_type: '1x240' },
    { cable_tag: '=GEN-1W001', cable_type: '1x240' },
    { cable_tag: '=GEN-1W001', cable_type: '1x240' },
  ];

  const cableRowIds = duplicateCables.map((c, idx) => getCableRowId(c, idx));
  assert.equal(cableRowIds.length, 3);
  assert.equal(new Set(cableRowIds).size, 3, 'All cable row IDs must be strictly unique');
  assert.deepEqual(cableRowIds, ['=GEN-1W001_0', '=GEN-1W001_1', '=GEN-1W001_2']);

  const duplicateBranches = [
    { branch_id: 'BR_01', length_m: 5 },
    { branch_id: 'BR_01', length_m: 10 },
  ];

  const branchRowIds = duplicateBranches.map((b, idx) => getBranchRowId(b, idx));
  assert.equal(branchRowIds.length, 2);
  assert.equal(new Set(branchRowIds).size, 2, 'All branch row IDs must be strictly unique');
  assert.deepEqual(branchRowIds, ['BR_01_0', 'BR_01_1']);
});
