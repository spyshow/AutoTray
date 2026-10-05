import * as XLSX from 'xlsx';
import { Cable, Branch, CableCategory } from './types';
import { lookupCatalogCableOd } from './cable-catalog';

export interface ParsedWorkbook {
  sheetNames: string[];
  sheets: Record<string, any[][]>;
}

export function parseExcelFile(arrayBuffer: ArrayBuffer): ParsedWorkbook {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const sheets: Record<string, any[][]> = {};

  for (const name of sheetNames) {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    sheets[name] = data;
  }

  return { sheetNames, sheets };
}

export function findBestHeaderMatch(headers: string[], patterns: string[]): string {
  const cleanHeaders = headers.map(h => String(h || '').trim().toLowerCase());

  // 1. Exact Match Priority
  for (const pattern of patterns) {
    const p = pattern.trim().toLowerCase();
    const exactIndex = cleanHeaders.findIndex(h => h === p);
    if (exactIndex !== -1) return headers[exactIndex];
  }

  // 2. Word Token Boundary Match (e.g. 'to' matches 'to node', 'from' matches 'from node')
  for (const pattern of patterns) {
    const p = pattern.trim().toLowerCase();
    const wordIndex = cleanHeaders.findIndex(h => {
      const words = h.split(/[\s_\-\(\)\/:]+/).filter(Boolean);
      return words.includes(p) || h.startsWith(`${p} `) || h.endsWith(` ${p}`);
    });
    if (wordIndex !== -1) return headers[wordIndex];
  }

  // 3. Substring Containment Match (for patterns >= 3 characters to avoid short false positives)
  for (const pattern of patterns) {
    const p = pattern.trim().toLowerCase();
    if (p.length < 3) continue;
    const partialIndex = cleanHeaders.findIndex(h => h.includes(p));
    if (partialIndex !== -1) return headers[partialIndex];
  }

  return '';
}

/**
 * Normalizes an IEC 81346 / EPLAN electrical reference designation (e.g. "=P181+M-EX3", "=P181+E-7E1-7X1").
 * - Internal cabinet modules/strips (+M-, +F-, +BCD-, +T1-, etc.) collapse to the parent panel (e.g. "P181").
 * - Field equipment (+E-, +CBE-) group by physical equipment drop point (e.g. "E-7E1") or clean tag.
 */
export function normalizeIecNode(rawVal: string, panelVal?: string, groupByDropPoint: boolean = true): string {
  const clean = String(rawVal || '').trim();
  const cleanPanel = panelVal ? String(panelVal).trim() : '';

  if (!clean) return cleanPanel;

  // 1. Internal cabinet module/strip (+M-, +F-, +BCD-, +T1-, +TBEE-) -> collapses to Panel
  if (/\+(?:M|F|BCD|T1|TBEE)[\-_]/i.test(clean)) {
    if (cleanPanel) return cleanPanel;
    const mPrefix = clean.match(/^=?([A-Za-z0-9_]+)\+/);
    if (mPrefix) return mPrefix[1];
    return clean;
  }

  // 2. Field equipment (+E-, +CBE-)
  const fieldMatch = clean.match(/\+(?:E|CBE)-([A-Za-z0-9_-]+)/i);
  if (fieldMatch) {
    const fullField = fieldMatch[1]; // e.g. "7E1-7X1", "46E1-RX2", "23H1"
    if (groupByDropPoint) {
      // If fullField contains a terminal suffix like "7E1-7X1" or "46E1-RX2" or "88E1-X15" or "50A1-50D1":
      // Extract base equipment (e.g. "7E1", "46E1", "88E1", "50A1")
      const dropMatch = fullField.match(/^([A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)-([A-Za-z0-9]+)$/);
      if (dropMatch) {
        return `E-${dropMatch[1]}`;
      }
      return `E-${fullField}`;
    }
    return `E-${fullField}`;
  }

  // If starts with '=' but has '+', e.g. '=LVD+M-X0'
  if (clean.startsWith('=')) {
    const stripped = clean.replace(/^=/, '');
    if (stripped.includes('+')) {
      const parts = stripped.split('+');
      return parts[0].trim();
    }
    return stripped;
  }

  return clean;
}

export function detectHasIecDesignations(sampleRows: any[][]): boolean {
  if (!sampleRows || sampleRows.length === 0) return false;
  for (let r = 0; r < Math.min(sampleRows.length, 15); r++) {
    const row = sampleRows[r];
    if (!row) continue;
    for (const cell of row) {
      const s = String(cell || '');
      if (s.includes('=') && s.includes('+')) return true;
      if (/\+(?:M|E|F|BCD)[\-_]/i.test(s)) return true;
    }
  }
  return false;
}

export function autoDetectCablesMapping(headers: string[]) {
  const cableTagCol = findBestHeaderMatch(headers, ['cable tag', 'tag', 'cable no', 'cable_id', 'cable id', 'cable name', 'wire', 'cable', 'id']);
  const cableSourceCol = findBestHeaderMatch(headers, ['source (from)', 'source node', 'from node', 'source', 'origin', 'from', 'start node', 'panel', 'src']);
  const cableDestCol = findBestHeaderMatch(headers, ['destination (to)', 'dest node', 'destination node', 'to node', 'destination', 'target', 'equipment', 'to', 'end node', 'dst']);
  const cableSourcePanelCol = findBestHeaderMatch(headers, ['source panel', 'src panel', 'from panel', 'owning panel', 'panel from', 'source_panel', 'src_panel']);
  const cableDestPanelCol = findBestHeaderMatch(headers, ['dest panel', 'destination panel', 'to panel', 'target panel', 'panel to', 'dest_panel', 'dst_panel']);
  const cableCoresCol = findBestHeaderMatch(headers, ['no. of cores', 'no of cores', 'number of cores', 'cores', 'no. of conductors', 'conductors', 'no of cond']);
  const cableSizeCol = findBestHeaderMatch(headers, ['cross section', 'cross_section', 'cross-section', 'size (mm2)', 'size mm2', 'sqmm', 'size', 'conductor size', 'mm2']);

  // Exclude columns already assigned to cores/size from being mistakenly matched as cableTypeCol
  const typeHeaders = headers.filter(h => h !== cableCoresCol && h !== cableSizeCol);
  const cableTypeCol = findBestHeaderMatch(typeHeaders, [
    'cores spec', 'specification', 'spec', 'cable spec', 'dimension', 'cable size', 'designation', 'part number', 'part no',
    'cross section', 'cores x size', 'cable type', 'cable_type', 'type', 'service', 'class', 'voltage', 'category', 'function'
  ]);

  const cableOdCol = findBestHeaderMatch(headers, ['od (mm)', 'od_mm', 'outer diameter', 'diameter', 'od', 'dia (mm)', 'dia', 'size_mm', 'cable od']);

  // Exclude cores and size columns from count headers so runs count isn't confused with cores
  const countHeaders = headers.filter(h => h !== cableCoresCol && h !== cableSizeCol && h !== cableTypeCol);
  const cableCountCol = findBestHeaderMatch(countHeaders, ['parallel runs', 'runs', 'parallel', 'parallel cables', 'runs qty', 'no of cables', 'quantity', 'qty', 'count']);

  return {
    cableTagCol,
    cableSourceCol,
    cableDestCol,
    cableSourcePanelCol,
    cableDestPanelCol,
    cableTypeCol,
    cableCoresCol,
    cableSizeCol,
    cableOdCol,
    cableCountCol,
  };
}

export function autoDetectBranchesMapping(headers: string[]) {
  return {
    branchIdCol: findBestHeaderMatch(headers, ['tray id', 'branch id', 'branch_id', 'tray', 'branch', 'segment', 'tray no', 'id', 'name']),
    branchFromCol: findBestHeaderMatch(headers, ['from node', 'node from', 'node_from', 'from', 'node a', 'start node', 'node_a']),
    branchToCol: findBestHeaderMatch(headers, ['to node', 'node to', 'node_to', 'to', 'node b', 'end node', 'node_b']),
    branchLevelCol: findBestHeaderMatch(headers, ['level', 'floor', 'elevation', 'tier', 'storey', 'zone']),
    branchTypeCol: findBestHeaderMatch(headers, ['orientation', 'branch type', 'type', 'horizontal/vertical', 'kind', 'direction']),
    branchLengthCol: findBestHeaderMatch(headers, ['length (m)', 'length_m', 'length', 'distance (m)', 'distance', 'span']),
    branchHeightCol: findBestHeaderMatch(headers, ['tray height (mm)', 'tray height', 'height (mm)', 'height', 'depth', 'side height', 'tray_height_mm']),
  };
}

/**
 * Normalizes industrial and European cable designations:
 * - Decimal commas: "1,5 mm²" -> "1.5 mm²", "0,56" -> "0.56"
 * - Multi-pair instrumentation: "4x2x0.56 mm²", "4x2 0.56" -> "4x2x0.56 mm²"
 * - Conductor types with earth 'G' and without earth 'X':
 *   "2Xx1.5", "2xx1.5", "2XX1.5", "4Gx1.5", "4Xx1.5", "5Gx1.5", "7Gx1.5", "7Xx1.5", "12Gx1.5", "2Xx0.5"
 *   -> "2x1.5 mm²", "4x1.5 mm²", "5x1.5 mm²", "7x1.5 mm²", "12x1.5 mm²", "2x0.5 mm²"
 */
export function normalizeCableSpec(rawSpec: string): string {
  if (!rawSpec) return '';
  let s = String(rawSpec).trim();
  // 1. Replace decimal commas between digits
  s = s.replace(/(\d+),(\d+)/g, '$1.$2');

  // 2. Multi-pair cables: e.g. 4x2x0.56, 4x2 0.56, 2x2x0.8
  const pairRegex = /(\d+)\s*[xX*×]\s*(\d+)\s*(?:[xX*×Gg]+|\s+)\s*([\d\.]+)/;
  const mPair = s.match(pairRegex);
  if (mPair) {
    return `${mPair[1]}x${mPair[2]}x${mPair[3]} mm²`;
  }

  // 3. Multi-core cables: handles 2Xx1.5, 2xx1.5, 2XX1.5, 4Gx1.5, 4Xx1.5, 7Gx1.5, 12Gx1.5, 4x1.5, 4G1.5, 1x240, etc.
  const coreSizeRegex = /(?:^|[^\d])(\d+)\s*(?:c|core|cores)?\s*(?:[gG]\s*[xX*×]?|[xX*×]{1,2}|[\*×\/])\s*([\d\.]+)/i;
  const m = s.match(coreSizeRegex);
  if (m) {
    return `${m[1]}x${m[2]} mm²`;
  }

  return s;
}

export function guessCableCategory(rawType: string): CableCategory {
  const s = String(rawType || '').trim().toLowerCase();
  if (
    s.includes('pwr') ||
    s.includes('power') ||
    s.includes('volt') ||
    s.includes('feeder') ||
    s.includes('motor') ||
    s.includes('400v') ||
    s.includes('mv') ||
    s.includes('lv') ||
    s.includes('high voltage')
  ) {
    return 'power';
  }
  if (
    s.includes('data') ||
    s.includes('bus') ||
    s.includes('eth') ||
    s.includes('net') ||
    s.includes('prof') ||
    s.includes('cat') ||
    s.includes('fiber') ||
    s.includes('modbus') ||
    s.includes('fieldbus')
  ) {
    return 'data';
  }
  return 'control';
}

export function mapRawDataToCables(
  rows: any[][],
  headerRowIndex: number,
  mapping: {
    cableTagCol: string;
    cableSourceCol: string;
    cableDestCol: string;
    cableTypeCol: string;
    cableOdCol?: string;
    cableCountCol?: string;
    cableCoresCol?: string;
    cableSizeCol?: string;
    cableSourcePanelCol?: string;
    cableDestPanelCol?: string;
  },
  typeCategoryMap: Record<string, CableCategory> = {},
  defaultOdMap?: {
    power?: number;
    control?: number;
    signal?: number;
    data?: number;
    global?: number;
    custom?: Record<string, number>;
  },
  options?: {
    normalizeIecNodes?: boolean;
    groupByDropPoint?: boolean;
  }
): Cable[] {
  if (rows.length <= headerRowIndex) return [];
  const headers = rows[headerRowIndex].map(h => String(h || '').trim());

  const tagIdx = headers.indexOf(mapping.cableTagCol);
  const srcIdx = headers.indexOf(mapping.cableSourceCol);
  const dstIdx = headers.indexOf(mapping.cableDestCol);
  const srcPanelIdx = mapping.cableSourcePanelCol ? headers.indexOf(mapping.cableSourcePanelCol) : -1;
  const dstPanelIdx = mapping.cableDestPanelCol ? headers.indexOf(mapping.cableDestPanelCol) : -1;
  const typeIdx = mapping.cableTypeCol ? headers.indexOf(mapping.cableTypeCol) : -1;
  const coresIdx = mapping.cableCoresCol ? headers.indexOf(mapping.cableCoresCol) : -1;
  const sizeIdx = mapping.cableSizeCol ? headers.indexOf(mapping.cableSizeCol) : -1;
  const odIdx = mapping.cableOdCol ? headers.indexOf(mapping.cableOdCol) : -1;
  const countIdx = mapping.cableCountCol ? headers.indexOf(mapping.cableCountCol) : -1;

  const cables: Cable[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const tag = tagIdx !== -1 && row[tagIdx] !== undefined ? String(row[tagIdx]).trim() : '';
    const rawSrc = srcIdx !== -1 && row[srcIdx] !== undefined ? String(row[srcIdx]).trim() : '';
    const rawDst = dstIdx !== -1 && row[dstIdx] !== undefined ? String(row[dstIdx]).trim() : '';
    let src = rawSrc;
    let dst = rawDst;
    const srcPanel = srcPanelIdx !== -1 && row[srcPanelIdx] !== undefined ? String(row[srcPanelIdx]).trim() : '';
    const dstPanel = dstPanelIdx !== -1 && row[dstPanelIdx] !== undefined ? String(row[dstPanelIdx]).trim() : '';

    if (!tag && !src && !dst) continue; // Skip empty rows

    // Extract panel prefixes from raw IEC designations (e.g. "=P101+E-93D1" -> "P101")
    const mSrcPrefix = rawSrc.match(/^=?([A-Za-z0-9_-]+)\+/);
    const mDstPrefix = rawDst.match(/^=?([A-Za-z0-9_-]+)\+/);
    let resolvedSrcPanel = srcPanel || (mSrcPrefix ? mSrcPrefix[1].trim() : '');
    let resolvedDstPanel = dstPanel || (mDstPrefix ? mDstPrefix[1].trim() : '');

    // If IEC 81346 normalization is enabled (Method 2: internal +M- collapses to Panel, field +E- groups by drop point)
    if (options?.normalizeIecNodes) {
      src = normalizeIecNode(src, resolvedSrcPanel, options.groupByDropPoint ?? true);
      dst = normalizeIecNode(dst, resolvedDstPanel, options.groupByDropPoint ?? true);
    }

    // If source or dest is already a panel code (e.g. "P101", "MCC_L1"), register as panel
    if (!resolvedSrcPanel && /^[A-Za-z0-9_-]+$/.test(src) && !/^(?:E|CBE)[\-_]/i.test(src)) {
      resolvedSrcPanel = src;
    }
    if (!resolvedDstPanel && /^[A-Za-z0-9_-]+$/.test(dst) && !/^(?:E|CBE)[\-_]/i.test(dst)) {
      resolvedDstPanel = dst;
    }

    // Cross-reconcile panels for device-to-device or panel-to-device connections:
    if (!resolvedSrcPanel && resolvedDstPanel) {
      resolvedSrcPanel = resolvedDstPanel;
    } else if (!resolvedDstPanel && resolvedSrcPanel) {
      resolvedDstPanel = resolvedSrcPanel;
    }

    let rawType = typeIdx !== -1 && row[typeIdx] !== undefined ? String(row[typeIdx]).trim() : '';
    let usedCountAsCores = false;

    // A) If separate cores and size columns are mapped, combine them into standard spec (e.g. 4x1.5 mm²)
    if (coresIdx !== -1 && sizeIdx !== -1) {
      const cVal = row[coresIdx] !== undefined ? String(row[coresIdx]).trim() : '';
      const sVal = row[sizeIdx] !== undefined ? String(row[sizeIdx]).trim().replace(/,/g, '.').replace(/mm²|sqmm|mm2/gi, '').trim() : '';
      if (cVal && sVal) {
        rawType = `${cVal}x${sVal} mm²`;
      }
    } else if (coresIdx !== -1 && sizeIdx === -1 && rawType) {
      // Cores mapped and rawType contains a size number (e.g. "1.5" or "1.5 mm²")
      const cVal = row[coresIdx] !== undefined ? String(row[coresIdx]).trim() : '';
      const sizeMatch = rawType.match(/^(\d+(?:\.\d+)?)\s*(?:mm²|sqmm|mm2)?$/i);
      if (cVal && sizeMatch) {
        rawType = `${cVal}x${sizeMatch[1]} mm²`;
      }
    } else if (coresIdx === -1 && sizeIdx !== -1 && countIdx !== -1) {
      // Cores column was not explicitly mapped, but countIdx has small integer (e.g. 1..12) and sizeIdx has cross section
      const cVal = row[countIdx] !== undefined ? String(row[countIdx]).trim() : '';
      const sVal = row[sizeIdx] !== undefined ? String(row[sizeIdx]).trim().replace(/,/g, '.').replace(/mm²|sqmm|mm2/gi, '').trim() : '';
      const cNum = parseInt(cVal, 10);
      const sNum = parseFloat(sVal);
      if (!isNaN(cNum) && cNum >= 1 && cNum <= 12 && !isNaN(sNum) && sNum > 0) {
        rawType = `${cNum}x${sVal} mm²`;
        usedCountAsCores = true;
      }
    }

    // Standardize via normalizeCableSpec (handles 2Xx1.5, 4Gx1.5, 4x2 0.56, 1,5mm², etc.)
    const normalizedSpec = normalizeCableSpec(rawType);
    if (normalizedSpec) {
      rawType = normalizedSpec;
    }

    if (!rawType) {
      rawType = 'Control';
    }

    const normalizedType = typeCategoryMap[rawType] || guessCableCategory(rawType);

    let od_mm: number | undefined = undefined;
    if (odIdx !== -1 && row[odIdx] !== undefined && String(row[odIdx]).trim() !== '') {
      const parsed = parseFloat(String(row[odIdx]));
      if (!isNaN(parsed) && parsed > 0) {
        od_mm = parsed;
      }
    }

    if (od_mm === undefined && defaultOdMap?.custom) {
      const lowerRaw = rawType.toLowerCase();
      for (const [k, v] of Object.entries(defaultOdMap.custom)) {
        const kLower = k.toLowerCase().trim();
        if ((kLower === lowerRaw || kLower.includes(lowerRaw) || lowerRaw.includes(kLower)) && v > 0) {
          od_mm = v;
          break;
        }
      }
    }

    if (od_mm === undefined) {
      // 1. Manufacturer technical handbook catalog lookup (e.g. 4x50 -> 32.1, 4x1.5 -> 10.3, 12x1.5 -> 14.8)
      const catalogOd = lookupCatalogCableOd(rawType);
      if (catalogOd !== null && catalogOd > 0) {
        od_mm = catalogOd;
      } else {
        // If cable has a specific core size designation (e.g. 12x1.5, 7x1.5, 24x1.5) or is control,
        // do NOT silently fall back to an assumed default OD. Leave it undefined so user is prompted in MissingSpecOdModal.
        const isCoreSizeSpec = /(?:^|[^\d])\d+\s*(?:c|core|cores)?\s*(?:[gGxX*×\/])\s*[\d\.]+/i.test(rawType);
        if (!isCoreSizeSpec && defaultOdMap) {
          if (normalizedType === 'power' && defaultOdMap.power) od_mm = defaultOdMap.power;
          else if (normalizedType === 'signal' && defaultOdMap.signal) od_mm = defaultOdMap.signal;
          else if ((normalizedType === 'data' || normalizedType === 'bus') && defaultOdMap.data) od_mm = defaultOdMap.data;
        }
      }
    }

    // Default count to 1 unless an explicit count column was mapped and not consumed as cores
    let count = 1;
    if (countIdx !== -1 && !usedCountAsCores && row[countIdx] !== undefined && String(row[countIdx]).trim() !== '') {
      const rawCount = parseInt(String(row[countIdx]), 10);
      if (!isNaN(rawCount) && rawCount > 0) {
        count = rawCount;
      }
    }

    cables.push({
      cable_tag: tag || `CABLE_${r}`,
      source_node: src || 'UNASSIGNED_SRC',
      dest_node: dst || 'UNASSIGNED_DST',
      cable_type: rawType, // keep original designation e.g. 4x1.5 mm² or 4x50
      od_mm,
      count,
      category: normalizedType,
      source_panel: resolvedSrcPanel || undefined,
      dest_panel: resolvedDstPanel || undefined,
    });
  }

  return cables;
}

export function mapRawDataToBranches(
  rows: any[][],
  headerRowIndex: number,
  mapping: {
    branchIdCol: string;
    branchFromCol: string;
    branchToCol: string;
    branchLevelCol: string;
    branchTypeCol: string;
    branchLengthCol: string;
    branchHeightCol: string;
  },
  defaultTrayHeight: number = 60.0
): Branch[] {
  if (rows.length <= headerRowIndex) return [];
  const headers = rows[headerRowIndex].map(h => String(h || '').trim());

  const idIdx = headers.indexOf(mapping.branchIdCol);
  const fromIdx = headers.indexOf(mapping.branchFromCol);
  const toIdx = headers.indexOf(mapping.branchToCol);
  const lvlIdx = headers.indexOf(mapping.branchLevelCol);
  const typeIdx = headers.indexOf(mapping.branchTypeCol);
  const lenIdx = headers.indexOf(mapping.branchLengthCol);
  const hgtIdx = headers.indexOf(mapping.branchHeightCol);

  const branches: Branch[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const id = idIdx !== -1 && row[idIdx] !== undefined ? String(row[idIdx]).trim() : '';
    const from = fromIdx !== -1 && row[fromIdx] !== undefined ? String(row[fromIdx]).trim() : '';
    const to = toIdx !== -1 && row[toIdx] !== undefined ? String(row[toIdx]).trim() : '';

    if (!id && !from && !to) continue;

    const level = lvlIdx !== -1 && row[lvlIdx] !== undefined ? String(row[lvlIdx]).trim() : 'Level 1';

    let branchType: 'horizontal' | 'vertical' = 'horizontal';
    if (typeIdx !== -1 && row[typeIdx] !== undefined) {
      const typeStr = String(row[typeIdx]).trim().toLowerCase();
      if (typeStr.includes('vert') || typeStr.includes('riser')) {
        branchType = 'vertical';
      }
    }

    const rawLen = lenIdx !== -1 && row[lenIdx] !== undefined ? parseFloat(String(row[lenIdx])) : 10.0;
    const length_m = isNaN(rawLen) || rawLen <= 0 ? 10.0 : rawLen;

    let tray_height_mm: number | undefined = undefined;
    if (hgtIdx !== -1 && row[hgtIdx] !== undefined && String(row[hgtIdx]).trim() !== '') {
      const parsedH = parseFloat(String(row[hgtIdx]));
      if (!isNaN(parsedH) && parsedH > 0) {
        tray_height_mm = parsedH;
      }
    }

    branches.push({
      branch_id: id || `BR_${r}`,
      node_from: from || 'NODE_A',
      node_to: to || 'NODE_B',
      level: level || 'Level 1',
      branch_type: branchType,
      length_m,
      tray_height_mm,
    });
  }

  return branches;
}

export function createSampleWorkbookBlob(): Blob {
  const wb = XLSX.utils.book_new();

  const cablesData = [
    ['Tag', 'Source Node', 'Destination Node', 'Type', 'OD (mm)', 'Count'],
    ['C_PWR_01', 'MCC_L1', 'FOREHEARTH_FAN_M1', 'Power', 28.4, 1],
    ['C_PWR_02', 'MCC_L1', 'COOLING_PUMP_P1', 'Power', 24.2, 1],
    ['C_PWR_03', 'MCC_L1', 'FEEDER_PANEL_L2', 'Power', 35.0, 1],
    ['C_PWR_04', 'TRANSF_01', 'MCC_L1', 'Power', 42.5, 3],
    ['C_PWR_05', 'MCC_L2', 'MIXER_MOTOR_M2', 'Power', 22.8, 1],
    ['C_CTRL_01', 'DCS_RACK_L1', 'FOREHEARTH_FAN_M1', 'Control', 12.5, 2],
    ['C_CTRL_02', 'DCS_RACK_L1', 'COOLING_PUMP_P1', 'Control', 14.0, 1],
    ['C_CTRL_03', 'PLC_PANEL_L2', 'MIXER_MOTOR_M2', 'Control', 12.0, 1],
    ['C_SIG_01', 'JUNC_L1_EAST', 'TEMP_TRANSMITTER_TT101', 'Signal', 8.8, 4],
    ['C_DATA_01', 'DCS_RACK_L1', 'PLC_PANEL_L2', 'Data', 11.2, 2],
    ['C_BUS_01', 'DCS_RACK_L1', 'MCC_L1', 'Bus', 9.5, 1],
  ];

  const branchesData = [
    ['Tray ID', 'From Node', 'To Node', 'Level', 'Orientation', 'Length (m)', 'Tray Height (mm)'],
    ['BR_L1_01', 'TRANSF_01', 'MCC_L1', 'Level 1', 'horizontal', 12.0, 100.0],
    ['BR_L1_02', 'MCC_L1', 'DCS_RACK_L1', 'Level 1', 'horizontal', 8.5, 60.0],
    ['BR_L1_03', 'MCC_L1', 'JUNC_L1_EAST', 'Level 1', 'horizontal', 14.5, 60.0],
    ['BR_L1_04', 'DCS_RACK_L1', 'JUNC_L1_EAST', 'Level 1', 'horizontal', 10.0, 60.0],
    ['BR_L1_05', 'JUNC_L1_EAST', 'COOLING_PUMP_P1', 'Level 1', 'horizontal', 7.5, 60.0],
    ['BR_L1_06', 'JUNC_L1_EAST', 'TEMP_TRANSMITTER_TT101', 'Level 1', 'horizontal', 6.0, 60.0],
    ['BR_L1_07', 'MCC_L1', 'RISER_EAST_L1', 'Level 1', 'horizontal', 18.0, 100.0],
    ['RISER_E_L1_L2', 'RISER_EAST_L1', 'RISER_EAST_L2', 'Transition', 'vertical', 5.0, 100.0],
    ['BR_L2_01', 'RISER_EAST_L2', 'FEEDER_PANEL_L2', 'Level 2', 'horizontal', 15.0, 100.0],
    ['BR_L2_02', 'FEEDER_PANEL_L2', 'MCC_L2', 'Level 2', 'horizontal', 6.0, 100.0],
    ['BR_L2_03', 'FEEDER_PANEL_L2', 'PLC_PANEL_L2', 'Level 2', 'horizontal', 9.0, 60.0],
    ['BR_L2_04', 'MCC_L2', 'MIXER_MOTOR_M2', 'Level 2', 'horizontal', 12.5, 60.0],
    ['BR_L2_08', 'RISER_EAST_L2', 'RISER_EAST_L2_L3', 'Level 2', 'horizontal', 4.0, 100.0],
    ['RISER_E_L2_L3', 'RISER_EAST_L2_L3', 'RISER_EAST_L3', 'Transition', 'vertical', 5.5, 100.0],
    ['BR_L3_02', 'RISER_EAST_L3', 'FOREHEARTH_FAN_M1', 'Level 3', 'horizontal', 22.0, 100.0],
  ];

  const wsCables = XLSX.utils.aoa_to_sheet(cablesData);
  const wsBranches = XLSX.utils.aoa_to_sheet(branchesData);

  XLSX.utils.book_append_sheet(wb, wsCables, 'Cables');
  XLSX.utils.book_append_sheet(wb, wsBranches, 'Branches');

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
