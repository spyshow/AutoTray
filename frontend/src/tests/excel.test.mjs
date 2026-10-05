import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupCatalogCableOd } from './calculator.test.mjs';

function findBestHeaderMatch(headers, patterns) {
  const cleanHeaders = headers.map(h => String(h || '').trim().toLowerCase());

  // 1. Exact Match Priority
  for (const pattern of patterns) {
    const p = pattern.trim().toLowerCase();
    const exactIndex = cleanHeaders.findIndex(h => h === p);
    if (exactIndex !== -1) return headers[exactIndex];
  }

  // 2. Word Token Boundary Match
  for (const pattern of patterns) {
    const p = pattern.trim().toLowerCase();
    const wordIndex = cleanHeaders.findIndex(h => {
      const words = h.split(/[\s_\-\(\)\/:]+/).filter(Boolean);
      return words.includes(p) || h.startsWith(`${p} `) || h.endsWith(` ${p}`);
    });
    if (wordIndex !== -1) return headers[wordIndex];
  }

  // 3. Substring Containment Match (>= 3 chars)
  for (const pattern of patterns) {
    const p = pattern.trim().toLowerCase();
    if (p.length < 3) continue;
    const partialIndex = cleanHeaders.findIndex(h => h.includes(p));
    if (partialIndex !== -1) return headers[partialIndex];
  }

  return '';
}

function guessCableCategory(rawType) {
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

export function normalizeCableSpec(rawSpec) {
  if (!rawSpec) return '';
  let s = String(rawSpec).trim();
  s = s.replace(/(\d+),(\d+)/g, '$1.$2');

  const pairRegex = /(\d+)\s*[xX*×]\s*(\d+)\s*(?:[xX*×Gg]+|\s+)\s*([\d\.]+)/;
  const mPair = s.match(pairRegex);
  if (mPair) {
    return `${mPair[1]}x${mPair[2]}x${mPair[3]} mm²`;
  }

  const coreSizeRegex = /(?:^|[^\d])(\d+)\s*(?:c|core|cores)?\s*(?:[gG]\s*[xX*×]?|[xX*×]{1,2}|[\*×\/])\s*([\d\.]+)/i;
  const m = s.match(coreSizeRegex);
  if (m) {
    return `${m[1]}x${m[2]} mm²`;
  }

  return s;
}

export function normalizeIecNode(rawVal, panelVal, groupByDropPoint = true) {
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

export function detectHasIecDesignations(sampleRows) {
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

function mapRawDataToCables(
  rows,
  headerRowIndex,
  mapping,
  typeCategoryMap = {},
  defaultOdMap,
  options
) {
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

  const cables = [];

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

    if (!tag && !src && !dst) continue;

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

    if (!resolvedSrcPanel && /^[A-Za-z0-9_-]+$/.test(src) && !/^(?:E|CBE)[\-_]/i.test(src)) {
      resolvedSrcPanel = src;
    }
    if (!resolvedDstPanel && /^[A-Za-z0-9_-]+$/.test(dst) && !/^(?:E|CBE)[\-_]/i.test(dst)) {
      resolvedDstPanel = dst;
    }

    if (!resolvedSrcPanel && resolvedDstPanel) {
      resolvedSrcPanel = resolvedDstPanel;
    } else if (!resolvedDstPanel && resolvedSrcPanel) {
      resolvedDstPanel = resolvedSrcPanel;
    }

    let rawType = typeIdx !== -1 && row[typeIdx] !== undefined ? String(row[typeIdx]).trim() : '';
    // Normalize European decimal commas (e.g. "1,5mm²" -> "1.5mm²", "0,56mm²" -> "0.56mm²")
    rawType = rawType.replace(/(\d+),(\d+)/g, '$1.$2');
    let usedCountAsCores = false;

    if (coresIdx !== -1 && sizeIdx !== -1) {
      const cVal = row[coresIdx] !== undefined ? String(row[coresIdx]).trim() : '';
      const sVal = row[sizeIdx] !== undefined ? String(row[sizeIdx]).trim().replace(/,/g, '.').replace(/mm²|sqmm|mm2/gi, '').trim() : '';
      if (cVal && sVal) {
        rawType = `${cVal}x${sVal} mm²`;
      }
    } else if (coresIdx !== -1 && sizeIdx === -1 && rawType) {
      const cVal = row[coresIdx] !== undefined ? String(row[coresIdx]).trim() : '';
      const sizeMatch = rawType.match(/^(\d+(?:\.\d+)?)\s*(?:mm²|sqmm|mm2)?$/i);
      if (cVal && sizeMatch) {
        rawType = `${cVal}x${sizeMatch[1]} mm²`;
      }
    } else if (coresIdx === -1 && sizeIdx !== -1 && countIdx !== -1) {
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

    let od_mm = undefined;
    if (odIdx !== -1 && row[odIdx] !== undefined && String(row[odIdx]).trim() !== '') {
      const parsed = parseFloat(String(row[odIdx]));
      if (!isNaN(parsed) && parsed > 0) {
        od_mm = parsed;
      }
    }

    if (od_mm === undefined && defaultOdMap) {
      const lowerRaw = rawType.toLowerCase();
      if (defaultOdMap.custom) {
        for (const [k, v] of Object.entries(defaultOdMap.custom)) {
          const kLower = k.toLowerCase().trim();
          if ((kLower === lowerRaw || kLower.includes(lowerRaw) || lowerRaw.includes(kLower)) && v > 0) {
            od_mm = v;
            break;
          }
        }
      }
      if (od_mm === undefined) {
        const catalogOd = lookupCatalogCableOd(rawType);
        if (catalogOd !== null && catalogOd > 0) {
          od_mm = catalogOd;
        } else if (normalizedType === 'power') od_mm = defaultOdMap.power || 25.0;
        else if (normalizedType === 'signal') od_mm = defaultOdMap.signal || 10.0;
        else if (normalizedType === 'data' || normalizedType === 'bus') od_mm = defaultOdMap.data || 8.5;
        else od_mm = defaultOdMap.control || 14.0;
      }
    }

    if (od_mm === undefined) {
      const catalogOd = lookupCatalogCableOd(rawType);
      od_mm = (catalogOd !== null && catalogOd > 0) ? catalogOd : 15.0;
    }

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
      cable_type: rawType,
      od_mm,
      count,
      category: normalizedType,
      source_panel: resolvedSrcPanel || undefined,
      dest_panel: resolvedDstPanel || undefined,
    });
  }

  return cables;
}

test('Fuzzy Header Matching recognizes industrial variations', () => {
  const headers = ['Cable ID', 'From Panel', 'Target Machine', 'Cable Class', 'Dia (mm)', 'Quantity', 'Total Length'];

  const tagMatch = findBestHeaderMatch(headers, ['cable tag', 'tag', 'cable no', 'cable_id', 'cable id', 'id']);
  assert.equal(tagMatch, 'Cable ID');

  const srcMatch = findBestHeaderMatch(headers, ['source node', 'from node', 'source', 'from panel', 'from', 'origin']);
  assert.equal(srcMatch, 'From Panel');

  const dstMatch = findBestHeaderMatch(headers, ['dest node', 'destination node', 'to node', 'destination', 'target machine', 'target']);
  assert.equal(dstMatch, 'Target Machine');

  const odMatch = findBestHeaderMatch(headers, ['od (mm)', 'diameter', 'od', 'dia (mm)', 'dia']);
  assert.equal(odMatch, 'Dia (mm)');

  const countMatch = findBestHeaderMatch(headers, ['count', 'qty', 'quantity']);
  assert.equal(countMatch, 'Quantity');
});

test('Word-token boundary matching avoids false-positive substrings', () => {
  const headers = ['Total Length', 'Width', 'Modified Date', 'Dest Node'];

  // Pattern 'to' MUST NOT match 'Total Length'
  const matchTo = findBestHeaderMatch(headers, ['dest node', 'to node', 'to']);
  assert.equal(matchTo, 'Dest Node');

  // Pattern 'id' MUST NOT match 'Width'
  const matchId = findBestHeaderMatch(headers, ['cable id', 'tag id', 'id']);
  assert.equal(matchId, '');

  // Pattern 'od' MUST NOT match 'Modified Date'
  const matchOd = findBestHeaderMatch(headers, ['od_mm', 'diameter', 'od']);
  assert.equal(matchOd, '');
});

test('Cable Category Normalization covers industrial designations', () => {
  assert.equal(guessCableCategory('400V Feeder'), 'power');
  assert.equal(guessCableCategory('Motor Lead PWR'), 'power');
  assert.equal(guessCableCategory('High Voltage Feeder'), 'power');
  assert.equal(guessCableCategory('PROFINET CAT6'), 'data');
  assert.equal(guessCableCategory('Modbus RS485'), 'data');
  assert.equal(guessCableCategory('Fiber Optic Multimode'), 'data');
  assert.equal(guessCableCategory('Thermocouple Type K'), 'control');
  assert.equal(guessCableCategory('4-20mA Pressure Sig'), 'control');
  assert.equal(guessCableCategory('24VDC Solenoid Control'), 'control');
});

test('mapRawDataToCables populates default OD when OD column is unmapped', () => {
  const rawRows = [
    ['Tag', 'From', 'To', 'Type', 'Qty'],
    ['C_PWR_1', 'MCC_1', 'MOTOR_1', '400V Feeder', 1],
    ['C_CTRL_1', 'PLC_1', 'VALVE_1', 'Control', 2],
    ['C_SPEC_1', 'PANEL_1', 'DEV_1', 'SPECIAL_BUS', 1],
  ];

  const mapping = {
    cableTagCol: 'Tag',
    cableSourceCol: 'From',
    cableDestCol: 'To',
    cableTypeCol: 'Type',
    cableOdCol: '', // Unmapped OD column
    cableCountCol: 'Qty',
  };

  const defaultOdMap = {
    power: 28.0,
    control: 13.5,
    signal: 9.0,
    data: 7.5,
    global: 15.0,
    custom: { 'SPECIAL_BUS': 11.2 },
  };

  const cables = mapRawDataToCables(rawRows, 0, mapping, {}, defaultOdMap);
  assert.equal(cables.length, 3);
  assert.equal(cables[0].cable_tag, 'C_PWR_1');
  assert.equal(cables[0].od_mm, 28.0); // Resolved power default
  assert.equal(cables[1].cable_tag, 'C_CTRL_1');
  assert.equal(cables[1].od_mm, 13.5); // Resolved control default
  assert.equal(cables[2].cable_tag, 'C_SPEC_1');
  assert.equal(cables[2].od_mm, 11.2); // Resolved custom override
});

test('autoDetectCablesMapping does not map cores to cableCountCol and maps cableCoresCol properly', () => {
  const headers = ['Cable Tag', 'From Node', 'To Node', 'Number of Cores', 'Cross section', 'Quantity'];
  const mapping = {
    cableTagCol: findBestHeaderMatch(headers, ['cable tag', 'tag', 'cable no', 'cable_id', 'cable id', 'wire', 'cable', 'id']),
    cableSourceCol: findBestHeaderMatch(headers, ['source node', 'from node', 'source', 'origin', 'from', 'start node', 'panel', 'src']),
    cableDestCol: findBestHeaderMatch(headers, ['dest node', 'destination node', 'to node', 'destination', 'target', 'equipment', 'to', 'end node', 'dst']),
    cableTypeCol: findBestHeaderMatch(headers, [
      'cross section', 'cross_section', 'cross-section', 'cores x size', 'cores x cross section', 'cores/size', 'cores x mm2',
      'specification', 'spec', 'dimension', 'cable size', 'cable spec', 'designation', 'part number', 'part no',
      'cable type', 'cable_type', 'type', 'service', 'class', 'voltage', 'category', 'function'
    ]),
    cableCoresCol: findBestHeaderMatch(headers, ['no. of cores', 'no of cores', 'number of cores', 'cores', 'no. of conductors', 'conductors']),
    cableSizeCol: findBestHeaderMatch(headers, ['cross section', 'cross_section', 'cross-section', 'size (mm2)', 'size mm2', 'sqmm', 'size']),
    cableCountCol: findBestHeaderMatch(headers, ['quantity', 'qty', 'count', 'parallel', 'runs', 'units', 'no of cables']),
  };

  assert.equal(mapping.cableCoresCol, 'Number of Cores');
  assert.equal(mapping.cableCountCol, 'Quantity');
  assert.notEqual(mapping.cableCountCol, 'Number of Cores');
});

test('mapRawDataToCables auto-combines separate cores and size into 4x1.5 mm² with count 1 and catalog OD', () => {
  const rawRows = [
    ['Tag', 'From', 'To', 'No of Cores', 'Cross section', 'Quantity'],
    ['C101', 'P101', 'P108', '4', '1.5', '1'],
    ['C102', 'P101', 'P108', '4', '50 mm²', '2'],
  ];

  const mapping = {
    cableTagCol: 'Tag',
    cableSourceCol: 'From',
    cableDestCol: 'To',
    cableTypeCol: '',
    cableCoresCol: 'No of Cores',
    cableSizeCol: 'Cross section',
    cableCountCol: 'Quantity',
    cableOdCol: '',
  };

  const cables = mapRawDataToCables(rawRows, 0, mapping);
  assert.equal(cables.length, 2);

  // Row 1: 4 cores x 1.5 -> "4x1.5 mm²", OD 10.3 from catalog, count 1
  assert.equal(cables[0].cable_tag, 'C101');
  assert.equal(cables[0].cable_type, '4x1.5 mm²');
  assert.equal(cables[0].od_mm, 10.3);
  assert.equal(cables[0].count, 1);

  // Row 2: 4 cores x 50 mm² -> "4x50 mm²", OD 32.1 from catalog, count 2
  assert.equal(cables[1].cable_tag, 'C102');
  assert.equal(cables[1].cable_type, '4x50 mm²');
  assert.equal(cables[1].od_mm, 32.1);
  assert.equal(cables[1].count, 2);
});

test('normalizeIecNode collapses internal cabinet terminations (+M-, +F-, +BCD-) to parent panel', () => {
  // Row 52: "=P181+M-EX3" with panel "P181" -> "P181"
  assert.equal(normalizeIecNode('=P181+M-EX3', 'P181'), 'P181');
  // Row 53: "=P181+M-EX2" with panel "P181" -> "P181"
  assert.equal(normalizeIecNode('=P181+M-EX2', 'P181'), 'P181');
  // Cabinet strip "=P181+F-7X1" -> "P181"
  assert.equal(normalizeIecNode('=P181+F-7X1', 'P181'), 'P181');
  // Cabinet strip "=P101+BCD-1" -> "P101"
  assert.equal(normalizeIecNode('=P101+BCD-1', 'P101'), 'P101');
  // If panelVal is omitted, extract panel prefix directly
  assert.equal(normalizeIecNode('=LVD+M-X0'), 'LVD');
  assert.equal(normalizeIecNode('=GEN+TBEE-1'), 'GEN');
});

test('normalizeIecNode groups field devices (+E-, +CBE-) by physical equipment drop point', () => {
  // Row 168: "=P181+E-7E1-7X1" -> groups to base equipment "E-7E1"
  assert.equal(normalizeIecNode('=P181+E-7E1-7X1', 'P181'), 'E-7E1');
  // Row 169: "=P181+E-7E1-9X1" -> also groups to base equipment "E-7E1" (same physical drop point!)
  assert.equal(normalizeIecNode('=P181+E-7E1-9X1', 'P181'), 'E-7E1');
  // Field equipment "=P101+E-46E1-RX2" -> "E-46E1"
  assert.equal(normalizeIecNode('=P101+E-46E1-RX2', 'P101'), 'E-46E1');
  // Field equipment without terminal dash "=P101+E-23H1" -> "E-23H1"
  assert.equal(normalizeIecNode('=P101+E-23H1', 'P101'), 'E-23H1');
  // Field equipment with CBE prefix "=P101+CBE-50A1-50D1" -> "E-50A1"
  assert.equal(normalizeIecNode('=P101+CBE-50A1-50D1', 'P101'), 'E-50A1');
  // If groupByDropPoint is false, preserves full terminal tag
  assert.equal(normalizeIecNode('=P181+E-7E1-7X1', 'P181', false), 'E-7E1-7X1');
});

test('detectHasIecDesignations detects EPLAN / IEC 81346 syntax in sample rows', () => {
  const iecRows = [
    ['Tag', 'Source', 'Destination'],
    ['=W16-52', '=P181+M-EX3', '=P181+M-EX2'],
    ['=W16-168', '=P181+M-EX3', '=P181+E-7E1-7X1'],
  ];
  assert.equal(detectHasIecDesignations(iecRows), true);

  const standardRows = [
    ['Cable Tag', 'From', 'To'],
    ['C1', 'MCC_1', 'MOTOR_1'],
    ['C2', 'PLC_1', 'VALVE_1'],
  ];
  assert.equal(detectHasIecDesignations(standardRows), false);
});

test('mapRawDataToCables correctly maps user Excel rows with IEC normalization and comma decimals', () => {
  const userRows = [
    ['Tag', 'Source (FROM)', 'Destination (TO)', 'Source Panel', 'Destination Panel', 'Spec', 'Qty'],
    // Row 52: internal panel connection P181 -> P181 with European comma decimal 1,5mm²
    ['=W16-52', '=P181+M-EX3', '=P181+M-EX2', 'P181', 'P181', '12G 1,5 mm²', '1'],
    // Row 168: panel P181 -> field equipment 7E1 terminal 7X1
    ['=W16-168', '=P181+M-EX3', '=P181+E-7E1-7X1', 'P181', 'P181', '4x1,5 mm²', '1'],
    // Row 169: panel P181 -> field equipment 7E1 terminal 9X1 (must group to E-7E1!)
    ['=W16-169', '=P181+M-EX3', '=P181+E-7E1-9X1', 'P181', 'P181', '4x1,5 mm²', '1'],
    // Row with 0,56mm² decimal comma
    ['=W16-200', '=P101+M-1', '=P101+E-46E1-RX2', 'P101', 'P101', '4x2 0,56 mm²', '1'],
  ];

  const mapping = {
    cableTagCol: 'Tag',
    cableSourceCol: 'Source (FROM)',
    cableDestCol: 'Destination (TO)',
    cableSourcePanelCol: 'Source Panel',
    cableDestPanelCol: 'Destination Panel',
    cableTypeCol: 'Spec',
    cableCountCol: 'Qty',
  };

  const cables = mapRawDataToCables(userRows, 0, mapping, {}, undefined, { normalizeIecNodes: true, groupByDropPoint: true });
  assert.equal(cables.length, 4);

  // Row 52: P181 -> P181 (local panel wiring)
  assert.equal(cables[0].cable_tag, '=W16-52');
  assert.equal(cables[0].source_node, 'P181');
  assert.equal(cables[0].dest_node, 'P181');
  assert.equal(cables[0].cable_type, '12x1.5 mm²');

  // Row 168: P181 -> E-7E1
  assert.equal(cables[1].cable_tag, '=W16-168');
  assert.equal(cables[1].source_node, 'P181');
  assert.equal(cables[1].dest_node, 'E-7E1');
  assert.equal(cables[1].cable_type, '4x1.5 mm²');
  assert.equal(cables[1].od_mm, 10.3); // Resolved catalog OD!

  // Row 169: P181 -> E-7E1 (grouped to same drop point, NO duplicate node!)
  assert.equal(cables[2].cable_tag, '=W16-169');
  assert.equal(cables[2].source_node, 'P181');
  assert.equal(cables[2].dest_node, 'E-7E1');
  assert.equal(cables[2].cable_type, '4x1.5 mm²');
  assert.equal(cables[2].od_mm, 10.3);

  // Row with 0,56mm² comma decimal
  assert.equal(cables[3].cable_tag, '=W16-200');
  assert.equal(cables[3].source_node, 'P101');
  assert.equal(cables[3].dest_node, 'E-46E1');
  assert.equal(cables[3].cable_type, '4x2x0.56 mm²');
});

test('normalizeCableSpec handles DIN/EPLAN conductor designations 2Xx, 4Gx, 7Xx, etc.', () => {
  // Conductor designation without earth: 'X' + multiplication letter 'x' -> 'Xx'
  assert.equal(normalizeCableSpec('2Xx1.5'), '2x1.5 mm²');
  assert.equal(normalizeCableSpec('2Xx1,5 mm²'), '2x1.5 mm²');
  assert.equal(normalizeCableSpec('2xx1.5 mm²'), '2x1.5 mm²');
  assert.equal(normalizeCableSpec('2XX1.5 mm²'), '2x1.5 mm²');
  assert.equal(normalizeCableSpec('4Xx1,5 mm²'), '4x1.5 mm²');
  assert.equal(normalizeCableSpec('7Xx1,5 mm²'), '7x1.5 mm²');
  assert.equal(normalizeCableSpec('2Xx0,5 mm²'), '2x0.5 mm²');

  // Conductor designation with earth: 'G' + multiplication letter 'x' -> 'Gx'
  assert.equal(normalizeCableSpec('4Gx1,5 mm²'), '4x1.5 mm²');
  assert.equal(normalizeCableSpec('4Gx2,5 mm²'), '4x2.5 mm²');
  assert.equal(normalizeCableSpec('5Gx1,5 mm²'), '5x1.5 mm²');
  assert.equal(normalizeCableSpec('7Gx1,5 mm²'), '7x1.5 mm²');
  assert.equal(normalizeCableSpec('12Gx1,5 mm²'), '12x1.5 mm²');
  assert.equal(normalizeCableSpec('18Gx1,5 mm²'), '18x1.5 mm²');
  assert.equal(normalizeCableSpec('18Gx0,75 mm²'), '18x0.75 mm²');
});

test('lookupCatalogCableOd resolves correct handbook ODs for normalized 2Xx and 4Gx specs', () => {
  // Standard 2x1.5 mm² (formerly appearing as 2Xx1,5 mm² in user modal)
  assert.equal(lookupCatalogCableOd('2Xx1,5 mm²'), 9.0);
  assert.equal(lookupCatalogCableOd('2Xx1.5'), 9.0);

  // Standard 4x1.5 mm² (formerly appearing as 4Gx1,5 mm² and 4Xx1,5 mm²)
  assert.equal(lookupCatalogCableOd('4Gx1,5 mm²'), 10.3);
  assert.equal(lookupCatalogCableOd('4Xx1,5 mm²'), 10.3);

  // Standard 4x2.5 mm² (formerly appearing as 4Gx2,5 mm²)
  assert.equal(lookupCatalogCableOd('4Gx2,5 mm²'), 11.5);
});

test('mapRawDataToCables auto-normalizes 2Xx and 4Gx specs and assigns catalog ODs', () => {
  const userRows = [
    ['Tag', 'From', 'To', 'Spec'],
    ['W_01', 'P101', 'E-01', '2Xx1,5 mm²'],
    ['W_02', 'P101', 'E-02', '4Gx1,5 mm²'],
    ['W_03', 'P101', 'E-03', '4Gx2,5 mm²'],
  ];

  const mapping = {
    cableTagCol: 'Tag',
    cableSourceCol: 'From',
    cableDestCol: 'To',
    cableTypeCol: 'Spec',
  };

  const cables = mapRawDataToCables(userRows, 0, mapping);
  assert.equal(cables.length, 3);

  // 2Xx1,5 mm² normalized to 2x1.5 mm² with OD 9.0
  assert.equal(cables[0].cable_type, '2x1.5 mm²');
  assert.equal(cables[0].od_mm, 9.0);

  // 4Gx1,5 mm² normalized to 4x1.5 mm² with OD 10.3
  assert.equal(cables[1].cable_type, '4x1.5 mm²');
  assert.equal(cables[1].od_mm, 10.3);

  // 4Gx2,5 mm² normalized to 4x2.5 mm² with OD 11.5
  assert.equal(cables[2].cable_type, '4x2.5 mm²');
  assert.equal(cables[2].od_mm, 11.5);
});

test('mapRawDataToCables extracts source_panel and dest_panel from raw IEC tags and panel columns', () => {
  const userRows = [
    ['Tag', 'Source (FROM)', 'Destination (TO)', 'Source Panel', 'Dest Panel', 'Spec'],
    ['W_101', '=P101+M-145D1', '=P101+E-93D1', 'P101', 'P101', '4x1.5 mm²'],
    ['W_102', '=P101+E-93D1', '=P101+E-93P2', 'P101', 'P101', '4x1.5 mm²'],
    ['W_103', '=P301+M-48D1', '=P301+E-50A1-50D1', 'P301', 'P301', '12x1.5 mm²'],
    ['W_104', '=P201+M-10', '=P201+E-15', '', '', '2x1.5 mm²'], // extracted from raw prefix =P201+
  ];

  const mapping = {
    cableTagCol: 'Tag',
    cableSourceCol: 'Source (FROM)',
    cableDestCol: 'Destination (TO)',
    cableSourcePanelCol: 'Source Panel',
    cableDestPanelCol: 'Dest Panel',
    cableTypeCol: 'Spec',
  };

  const cables = mapRawDataToCables(userRows, 0, mapping, {}, undefined, {
    normalizeIecNodes: true,
    groupByDropPoint: true,
  });

  assert.equal(cables.length, 4);

  // Row 1: P101 -> E-93D1
  assert.equal(cables[0].source_node, 'P101');
  assert.equal(cables[0].dest_node, 'E-93D1');
  assert.equal(cables[0].source_panel, 'P101');
  assert.equal(cables[0].dest_panel, 'P101');

  // Row 2: E-93D1 -> E-93P2
  assert.equal(cables[1].source_node, 'E-93D1');
  assert.equal(cables[1].dest_node, 'E-93P2');
  assert.equal(cables[1].source_panel, 'P101');
  assert.equal(cables[1].dest_panel, 'P101');

  // Row 3: P301 -> E-50A1
  assert.equal(cables[2].source_node, 'P301');
  assert.equal(cables[2].dest_node, 'E-50A1');
  assert.equal(cables[2].source_panel, 'P301');
  assert.equal(cables[2].dest_panel, 'P301');

  // Row 4: P201 -> E-15 (extracted from =P201+ prefix)
  assert.equal(cables[3].source_node, 'P201');
  assert.equal(cables[3].dest_node, 'E-15');
  assert.equal(cables[3].source_panel, 'P201');
  assert.equal(cables[3].dest_panel, 'P201');
});




