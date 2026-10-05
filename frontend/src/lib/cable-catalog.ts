export interface CatalogCableItem {
  code?: string;
  category: '1C_450_750V_BUILDING' | '1C_450_750V_FLEX' | '1C_06_1KV_FLEX' | '2C_06_1KV' | '3C_06_1KV' | '4C_06_1KV' | '5C_06_1KV' | 'MULTI_CTRL';
  categoryLabel: string;
  voltage: '450/750 V' | '0.6/1 kV';
  cores: number;
  size_mm2: number;
  conductorType: 'Solid/Stranded' | 'Flexible';
  insulationSheath: 'Cu/PVC' | 'Cu/PVC/PVC';
  standard: 'IEC 60227 & BS 6004' | 'IEC 60502';
  designation: string; // e.g. "4x50 mm²", "1x240 mm²"
  od_mm: number;
  weight_kg_km?: number;
  currentAir_A?: number;
}

// 1. Full Technical Catalog Database from Technical Handbook Pages 1 to 5
export const LOW_VOLTAGE_CABLE_CATALOG: CatalogCableItem[] = [
  // -------------------------------------------------------------------------
  // PAGE 1: 450/750 V Single Core Solid or Stranded Copper Conductor, Cu/PVC (IEC 60227 & BS 6004)
  // -------------------------------------------------------------------------
  { code: 'CPD-S001-U04', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 1.5, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x1.5 mm² re', od_mm: 2.8, weight_kg_km: 20, currentAir_A: 17 },
  { code: 'CPD-T001-U04', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 1.5, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x1.5 mm² rm', od_mm: 3.0, weight_kg_km: 21, currentAir_A: 17 },
  { code: 'CPD-S001-U05', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 2.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x2 mm² re', od_mm: 3.2, weight_kg_km: 27, currentAir_A: 19 },
  { code: 'CPD-T001-U05', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 2.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x2 mm² rm', od_mm: 3.4, weight_kg_km: 28, currentAir_A: 19 },
  { code: 'CPD-S001-U06', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 2.5, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x2.5 mm² re', od_mm: 3.4, weight_kg_km: 31, currentAir_A: 24 },
  { code: 'CPD-T001-U06', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 2.5, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x2.5 mm² rm', od_mm: 3.6, weight_kg_km: 33, currentAir_A: 24 },
  { code: 'CPD-S001-U07', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 3.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x3 mm² re', od_mm: 3.6, weight_kg_km: 37, currentAir_A: 27 },
  { code: 'CPD-T001-U07', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 3.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x3 mm² rm', od_mm: 3.8, weight_kg_km: 39, currentAir_A: 27 },
  { code: 'CPD-S001-U08', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 4.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x4 mm² re', od_mm: 3.9, weight_kg_km: 47, currentAir_A: 32 },
  { code: 'CPD-T001-U08', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 4.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x4 mm² rm', od_mm: 4.2, weight_kg_km: 50, currentAir_A: 32 },
  { code: 'CPD-S001-U09', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 6.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x6 mm² re', od_mm: 4.4, weight_kg_km: 68, currentAir_A: 40 },
  { code: 'CPD-T001-U09', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 6.0, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x6 mm² rm', od_mm: 4.7, weight_kg_km: 71, currentAir_A: 40 },
  { code: 'CPD-T001-U10', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 10, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x10 mm² rm', od_mm: 6.1, weight_kg_km: 117, currentAir_A: 57 },
  { code: 'CPD-T001-U11', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 16, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x16 mm² rm', od_mm: 7.1, weight_kg_km: 177, currentAir_A: 76 },
  { code: 'CPD-T001-U12', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 25, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x25 mm² rm', od_mm: 8.8, weight_kg_km: 278, currentAir_A: 103 },
  { code: 'CPD-T001-U13', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 35, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x35 mm² rm', od_mm: 9.9, weight_kg_km: 371, currentAir_A: 128 },
  { code: 'CPD-T001-U14', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 50, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x50 mm² rm', od_mm: 11.8, weight_kg_km: 514, currentAir_A: 156 },
  { code: 'CPD-T001-U15', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 70, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x70 mm² rm', od_mm: 13.5, weight_kg_km: 711, currentAir_A: 200 },
  { code: 'CPD-T001-U16', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 95, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x95 mm² rm', od_mm: 15.7, weight_kg_km: 967, currentAir_A: 251 },
  { code: 'CPD-T001-U17', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 120, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x120 mm² rm', od_mm: 17.4, weight_kg_km: 1240, currentAir_A: 293 },
  { code: 'CPD-T001-U18', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 150, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x150 mm² rm', od_mm: 19.4, weight_kg_km: 1500, currentAir_A: 335 },
  { code: 'CPD-T001-U19', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 185, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x185 mm² rm', od_mm: 21.5, weight_kg_km: 1852, currentAir_A: 390 },
  { code: 'CPD-T001-U20', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 240, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x240 mm² rm', od_mm: 24.7, weight_kg_km: 2457, currentAir_A: 471 },
  { code: 'CPD-T001-U30', category: '1C_450_750V_BUILDING', categoryLabel: 'Single Core Building Wire (Solid/Stranded)', voltage: '450/750 V', cores: 1, size_mm2: 300, conductorType: 'Solid/Stranded', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x300 mm² rm', od_mm: 27.2, weight_kg_km: 2977, currentAir_A: 540 },

  // -------------------------------------------------------------------------
  // PAGE 2: 450/750 V Single Core Flexible Copper Conductor, Cu/PVC (IEC 60227 & BS 6004)
  // -------------------------------------------------------------------------
  { code: 'CPD-F001-U04', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x1.5 mm² Flex', od_mm: 3.0, weight_kg_km: 21, currentAir_A: 17 },
  { code: 'CPD-F001-U06', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 2.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x2.5 mm² Flex', od_mm: 3.7, weight_kg_km: 34, currentAir_A: 24 },
  { code: 'CPD-F001-U08', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 4.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x4 mm² Flex', od_mm: 4.5, weight_kg_km: 50, currentAir_A: 32 },
  { code: 'CPD-F001-U09', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 6.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x6 mm² Flex', od_mm: 5.1, weight_kg_km: 71, currentAir_A: 40 },
  { code: 'CPD-F001-U10', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 10, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x10 mm² Flex', od_mm: 6.9, weight_kg_km: 120, currentAir_A: 57 },
  { code: 'CPD-F001-U11', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 16, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x16 mm² Flex', od_mm: 7.6, weight_kg_km: 179, currentAir_A: 76 },
  { code: 'CPD-F001-U12', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 25, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x25 mm² Flex', od_mm: 9.5, weight_kg_km: 276, currentAir_A: 103 },
  { code: 'CPD-F001-U13', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 35, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x35 mm² Flex', od_mm: 11.0, weight_kg_km: 375, currentAir_A: 128 },
  { code: 'CPD-F001-U14', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 50, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x50 mm² Flex', od_mm: 12.6, weight_kg_km: 542, currentAir_A: 156 },
  { code: 'CPD-F001-U15', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 70, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x70 mm² Flex', od_mm: 14.6, weight_kg_km: 733, currentAir_A: 200 },
  { code: 'CPD-F001-U16', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 95, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x95 mm² Flex', od_mm: 16.8, weight_kg_km: 957, currentAir_A: 251 },
  { code: 'CPD-F001-U17', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 120, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x120 mm² Flex', od_mm: 18.9, weight_kg_km: 1243, currentAir_A: 293 },
  { code: 'CPD-F001-U18', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 150, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x150 mm² Flex', od_mm: 21.2, weight_kg_km: 1548, currentAir_A: 335 },
  { code: 'CPD-F001-U19', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 185, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x185 mm² Flex', od_mm: 23.4, weight_kg_km: 1895, currentAir_A: 390 },
  { code: 'CPD-F001-U20', category: '1C_450_750V_FLEX', categoryLabel: 'Single Core Flexible (450/750V)', voltage: '450/750 V', cores: 1, size_mm2: 240, conductorType: 'Flexible', insulationSheath: 'Cu/PVC', standard: 'IEC 60227 & BS 6004', designation: '1x240 mm² Flex', od_mm: 26.7, weight_kg_km: 2400, currentAir_A: 471 },

  // -------------------------------------------------------------------------
  // PAGE 3: 0.6/1 kV Single Core Flexible Copper, Cu/PVC/PVC Sheathed (IEC 60502)
  // -------------------------------------------------------------------------
  { code: 'CP1-F101-U08', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 4.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x4 mm²', od_mm: 6.7, weight_kg_km: 80, currentAir_A: 29 },
  { code: 'CP1-F101-U09', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 6.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x6 mm²', od_mm: 7.5, weight_kg_km: 105, currentAir_A: 38 },
  { code: 'CP1-F101-U10', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 10, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x10 mm²', od_mm: 8.3, weight_kg_km: 150, currentAir_A: 51 },
  { code: 'CP1-F101-U11', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 16, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x16 mm²', od_mm: 9.2, weight_kg_km: 205, currentAir_A: 65 },
  { code: 'CP1-F101-U12', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 25, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x25 mm²', od_mm: 11.1, weight_kg_km: 310, currentAir_A: 90 },
  { code: 'CP1-F101-U13', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 35, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x35 mm²', od_mm: 11.9, weight_kg_km: 405, currentAir_A: 110 },
  { code: 'CP1-F101-U14', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 50, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x50 mm²', od_mm: 14.0, weight_kg_km: 565, currentAir_A: 135 },
  { code: 'CP1-F101-U15', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 70, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x70 mm²', od_mm: 15.4, weight_kg_km: 780, currentAir_A: 170 },
  { code: 'CP1-F101-U16', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 95, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x95 mm²', od_mm: 17.3, weight_kg_km: 1025, currentAir_A: 210 },
  { code: 'CP1-F101-U17', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 120, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x120 mm²', od_mm: 19.7, weight_kg_km: 1285, currentAir_A: 245 },
  { code: 'CP1-F101-U18', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 150, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x150 mm²', od_mm: 22.0, weight_kg_km: 1600, currentAir_A: 280 },
  { code: 'CP1-F101-U19', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 185, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x185 mm²', od_mm: 25.0, weight_kg_km: 1995, currentAir_A: 320 },
  { code: 'CP1-F101-U20', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 240, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x240 mm²', od_mm: 29.7, weight_kg_km: 2550, currentAir_A: 385 },
  { code: 'CP1-F101-U30', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 300, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x300 mm²', od_mm: 32.6, weight_kg_km: 3260, currentAir_A: 450 },
  { code: 'CP1-F101-U40', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 400, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x400 mm²', od_mm: 37.2, weight_kg_km: 4245, currentAir_A: 520 },
  { code: 'CP1-F101-U50', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 500, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x500 mm²', od_mm: 42.1, weight_kg_km: 5340, currentAir_A: 600 },
  { code: 'CP1-F101-U60', category: '1C_06_1KV_FLEX', categoryLabel: 'Single Core Sheathed 0.6/1kV', voltage: '0.6/1 kV', cores: 1, size_mm2: 630, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '1x630 mm²', od_mm: 46.6, weight_kg_km: 6890, currentAir_A: 680 },

  // -------------------------------------------------------------------------
  // PAGE 4: 0.6/1 kV Multi-Core (Two Cores), Cu/PVC/PVC Flexible (IEC 60502)
  // -------------------------------------------------------------------------
  { code: 'CP1-F102-U04', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x1.5 mm²', od_mm: 9.0, weight_kg_km: 125, currentAir_A: 20 },
  { code: 'CP1-F102-U06', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 2.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x2.5 mm²', od_mm: 10.0, weight_kg_km: 160, currentAir_A: 28 },
  { code: 'CP1-F102-U08', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 4.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x4 mm²', od_mm: 11.8, weight_kg_km: 225, currentAir_A: 39 },
  { code: 'CP1-F102-U09', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 6.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x6 mm²', od_mm: 13.4, weight_kg_km: 295, currentAir_A: 50 },
  { code: 'CP1-F102-U10', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 10, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x10 mm²', od_mm: 15.5, weight_kg_km: 345, currentAir_A: 66 },
  { code: 'CP1-F102-U11', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 16, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x16 mm²', od_mm: 17.3, weight_kg_km: 470, currentAir_A: 88 },
  { code: 'CP1-F102-U12', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 25, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x25 mm²', od_mm: 21.1, weight_kg_km: 710, currentAir_A: 116 },
  { code: 'CP1-F102-U13', category: '2C_06_1KV', categoryLabel: '2-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 2, size_mm2: 35, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x35 mm²', od_mm: 22.7, weight_kg_km: 920, currentAir_A: 143 },

  // -------------------------------------------------------------------------
  // PAGE 4: 0.6/1 kV Multi-Core (Three Cores), Cu/PVC/PVC Flexible (IEC 60502)
  // -------------------------------------------------------------------------
  { code: 'CP1-F103-U04', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x1.5 mm²', od_mm: 9.5, weight_kg_km: 145, currentAir_A: 18 },
  { code: 'CP1-F103-U06', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 2.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x2.5 mm²', od_mm: 10.6, weight_kg_km: 190, currentAir_A: 22 },
  { code: 'CP1-F103-U08', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 4.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x4 mm²', od_mm: 12.5, weight_kg_km: 270, currentAir_A: 31 },
  { code: 'CP1-F103-U09', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 6.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x6 mm²', od_mm: 14.2, weight_kg_km: 355, currentAir_A: 39 },
  { code: 'CP1-F103-U10', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 10, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x10 mm²', od_mm: 16.5, weight_kg_km: 460, currentAir_A: 53 },
  { code: 'CP1-F103-U11', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 16, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x16 mm²', od_mm: 18.4, weight_kg_km: 635, currentAir_A: 72 },
  { code: 'CP1-F103-U12', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 25, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x25 mm²', od_mm: 22.5, weight_kg_km: 965, currentAir_A: 94 },
  { code: 'CP1-F103-U13', category: '3C_06_1KV', categoryLabel: '3-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 3, size_mm2: 35, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '3x35 mm²', od_mm: 24.3, weight_kg_km: 1275, currentAir_A: 110 },

  // -------------------------------------------------------------------------
  // PAGE 5: 0.6/1 kV Multi-Core (Four Cores), Cu/PVC/PVC Flexible (IEC 60502)
  // -------------------------------------------------------------------------
  { code: 'CP1-F104-U04', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x1.5 mm²', od_mm: 10.3, weight_kg_km: 175, currentAir_A: 18 },
  { code: 'CP1-F104-U06', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 2.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x2.5 mm²', od_mm: 11.5, weight_kg_km: 225, currentAir_A: 22 },
  { code: 'CP1-F104-U08', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 4.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x4 mm²', od_mm: 13.7, weight_kg_km: 330, currentAir_A: 31 },
  { code: 'CP1-F104-U09', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 6.0, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x6 mm²', od_mm: 15.6, weight_kg_km: 435, currentAir_A: 39 },
  { code: 'CP1-F104-U10', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 10, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x10 mm²', od_mm: 18.1, weight_kg_km: 580, currentAir_A: 53 },
  { code: 'CP1-F104-U11', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 16, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x16 mm²', od_mm: 20.2, weight_kg_km: 810, currentAir_A: 72 },
  { code: 'CP1-F104-U12', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 25, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x25 mm²', od_mm: 24.8, weight_kg_km: 1245, currentAir_A: 94 },
  { code: 'CP1-F104-U13', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 35, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x35 mm²', od_mm: 26.8, weight_kg_km: 1645, currentAir_A: 110 },
  { code: 'CP1-F104-U14', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 50, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x50 mm²', od_mm: 32.1, weight_kg_km: 2305, currentAir_A: 138 },
  { code: 'CP1-F104-U15', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 70, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x70 mm²', od_mm: 35.6, weight_kg_km: 3220, currentAir_A: 171 },
  { code: 'CP1-F104-U16', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 95, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x95 mm²', od_mm: 40.2, weight_kg_km: 4250, currentAir_A: 209 },
  { code: 'CP1-F104-U17', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 120, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x120 mm²', od_mm: 46.0, weight_kg_km: 5320, currentAir_A: 242 },
  { code: 'CP1-F104-U18', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 150, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x150 mm²', od_mm: 51.4, weight_kg_km: 6640, currentAir_A: 275 },
  { code: 'CP1-F104-U19', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 185, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x185 mm²', od_mm: 58.4, weight_kg_km: 8275, currentAir_A: 314 },
  { code: 'CP1-F104-U20', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 240, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x240 mm²', od_mm: 70.2, weight_kg_km: 10655, currentAir_A: 374 },
  { code: 'CP1-F104-U30', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 300, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x300 mm²', od_mm: 77.1, weight_kg_km: 13630, currentAir_A: 440 },
  { code: 'CP1-F104-U40', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 400, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x400 mm²', od_mm: 88.2, weight_kg_km: 17775, currentAir_A: 507 },
  { code: 'CP1-F104-U50', category: '4C_06_1KV', categoryLabel: '4-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 4, size_mm2: 500, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '4x500 mm²', od_mm: 100.0, weight_kg_km: 22400, currentAir_A: 566 },

  // -------------------------------------------------------------------------
  // PAGE 5: 0.6/1 kV Multi-Core (Five Cores), Cu/PVC/PVC Flexible (IEC 60502)
  // -------------------------------------------------------------------------
  { code: 'CP1-F1A5-U13', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 35, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x35 mm²', od_mm: 29.7, weight_kg_km: 2040, currentAir_A: 110 },
  { code: 'CP1-F1A5-U14', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 50, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x50 mm²', od_mm: 35.6, weight_kg_km: 2865, currentAir_A: 138 },
  { code: 'CP1-F1A5-U15', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 70, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x70 mm²', od_mm: 39.7, weight_kg_km: 4020, currentAir_A: 171 },
  { code: 'CP1-F1A5-U16', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 95, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x95 mm²', od_mm: 44.3, weight_kg_km: 5270, currentAir_A: 209 },
  { code: 'CP1-F1A5-U17', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 120, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x120 mm²', od_mm: 51.2, weight_kg_km: 6640, currentAir_A: 242 },
  { code: 'CP1-F1A5-U18', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 150, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x150 mm²', od_mm: 57.1, weight_kg_km: 8260, currentAir_A: 275 },
  { code: 'CP1-F1A5-U19', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 185, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x185 mm²', od_mm: 64.8, weight_kg_km: 10285, currentAir_A: 314 },
  { code: 'CP1-F1A5-U20', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 240, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x240 mm²', od_mm: 78.1, weight_kg_km: 13270, currentAir_A: 374 },
  { code: 'CP1-F1A5-U30', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 300, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x300 mm²', od_mm: 85.6, weight_kg_km: 16935, currentAir_A: 440 },
  { code: 'CP1-F1A5-U40', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 400, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x400 mm²', od_mm: 98.1, weight_kg_km: 22140, currentAir_A: 507 },
  { code: 'CP1-F1A5-U50', category: '5C_06_1KV', categoryLabel: '5-Core Multicore 0.6/1kV', voltage: '0.6/1 kV', cores: 5, size_mm2: 500, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '5x500 mm²', od_mm: 111.2, weight_kg_km: 27885, currentAir_A: 566 },

  // -------------------------------------------------------------------------
  // PAGE 6: Standard Multi-Core Flexible Control Cables (DIN EN 50525 / VDE 0281 / IEC 60502, e.g. YSLY-JZ / Ölflex Classic 110)
  // -------------------------------------------------------------------------
  { code: 'CTRL-02-050', category: 'MULTI_CTRL', categoryLabel: 'Multi-Core Control (300/500V)', voltage: '0.6/1 kV', cores: 2, size_mm2: 0.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '2x0.5 mm²', od_mm: 5.6, weight_kg_km: 42, currentAir_A: 6 },
  { code: 'CTRL-07-150', category: 'MULTI_CTRL', categoryLabel: 'Multi-Core Control (300/500V)', voltage: '0.6/1 kV', cores: 7, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '7x1.5 mm²', od_mm: 11.5, weight_kg_km: 220, currentAir_A: 15 },
  { code: 'CTRL-10-150', category: 'MULTI_CTRL', categoryLabel: 'Multi-Core Control (300/500V)', voltage: '0.6/1 kV', cores: 10, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '10x1.5 mm²', od_mm: 13.8, weight_kg_km: 295, currentAir_A: 13 },
  { code: 'CTRL-12-150', category: 'MULTI_CTRL', categoryLabel: 'Multi-Core Control (300/500V)', voltage: '0.6/1 kV', cores: 12, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '12x1.5 mm²', od_mm: 14.8, weight_kg_km: 340, currentAir_A: 12 },
  { code: 'CTRL-18-150', category: 'MULTI_CTRL', categoryLabel: 'Multi-Core Control (300/500V)', voltage: '0.6/1 kV', cores: 18, size_mm2: 1.5, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '18x1.5 mm²', od_mm: 17.2, weight_kg_km: 490, currentAir_A: 10 },
  { code: 'CTRL-18-075', category: 'MULTI_CTRL', categoryLabel: 'Multi-Core Control (300/500V)', voltage: '0.6/1 kV', cores: 18, size_mm2: 0.75, conductorType: 'Flexible', insulationSheath: 'Cu/PVC/PVC', standard: 'IEC 60502', designation: '18x0.75 mm²', od_mm: 13.9, weight_kg_km: 310, currentAir_A: 8 },
];

/**
 * Intelligent Catalog Cable OD Lookup
 * Recognizes industrial designation patterns such as:
 * - "4x50", "4X50", "4 x 50", "4C x 50", "4Cx50mm2", "4C*50", "4 x 50 mm²" -> 32.1
 * - "3x16", "3x16mm2", "3Cx16" -> 18.4
 * - "2x2.5", "2x2.5mm2" -> 10.0
 * - "5x70", "5x70mm2" -> 39.7
 * - "12x1.5", "12G1.5", "12Gx1.5 mm²" -> 14.8
 * - "7x1.5", "7Gx1.5 mm²" -> 11.5
 * - "1x240", "1x240mm2", "1C x 240" -> 29.7 (0.6/1kV)
 * - Exact product code matching (e.g. "CP1-F104-U14" -> 32.1)
 */
export function lookupCatalogCableOd(rawType: string, catalog: CatalogCableItem[] = LOW_VOLTAGE_CABLE_CATALOG): number | null {
  if (!rawType) return null;
  const clean = rawType.trim().replace(/(\d+),(\d+)/g, '$1.$2');
  const lower = clean.toLowerCase();

  // 1. Direct Product Code match
  const byCode = catalog.find(
    c => c.code && c.code.toLowerCase() === lower
  );
  if (byCode) return byCode.od_mm;

  // 2. Multi-Core Pattern Extraction: (cores) x (size in mm2)
  // Matches: 4x50, 4 x 50, 4cx50, 4c x 50, 4*50, 4/50, 4x2.5, 2Xx1.5, 4Gx1.5, 12x1.5, 12Gx1.5, etc.
  const multiCoreRegex = /(?:^|[^\d])(\d+)\s*(?:c|core|cores)?\s*(?:[gG]\s*[xX*×]?|[xX*×]{1,2}|[\*×\/])\s*(\d+(?:\.\d+)?)/i;
  const match = clean.match(multiCoreRegex);

  if (match) {
    const cores = parseInt(match[1], 10);
    const size = parseFloat(match[2]);

    if (cores >= 1 && size > 0) {
      if (cores === 4) {
        const item = catalog.find(c => c.category === '4C_06_1KV' && Math.abs(c.size_mm2 - size) < 0.01);
        if (item) return item.od_mm;
      } else if (cores === 3) {
        const item = catalog.find(c => c.category === '3C_06_1KV' && Math.abs(c.size_mm2 - size) < 0.01);
        if (item) return item.od_mm;
      } else if (cores === 2) {
        const item = catalog.find(c => c.category === '2C_06_1KV' && Math.abs(c.size_mm2 - size) < 0.01);
        if (item) return item.od_mm;
      } else if (cores === 5) {
        const item = catalog.find(c => c.category === '5C_06_1KV' && Math.abs(c.size_mm2 - size) < 0.01);
        if (item) return item.od_mm;
      } else if (cores === 1) {
        // Single core 0.6/1kV sheathed
        const item = catalog.find(c => c.category === '1C_06_1KV_FLEX' && Math.abs(c.size_mm2 - size) < 0.01);
        if (item) return item.od_mm;
        // Or 450/750V
        const item450 = catalog.find(c => c.category === '1C_450_750V_FLEX' && Math.abs(c.size_mm2 - size) < 0.01);
        if (item450) return item450.od_mm;
      }

      // Check general catalog for matching cores and size (e.g. MULTI_CTRL 7C, 10C, 12C, 18C, etc.)
      const multiItem = catalog.find(c => c.cores === cores && Math.abs(c.size_mm2 - size) < 0.01);
      if (multiItem) return multiItem.od_mm;
    }

    // IMPORTANT: It matched a multi-core designation (e.g. 12x1.5).
    // NEVER fall through to single-core cross-section matching (which would wrongly match 1.5 mm² to a single 3mm wire)!
    return null;
  }

  // 3. Single-Core Cross-Sectional Area Only: e.g. "240mm2", "185 mm2", "50mm2"
  // ONLY reached if NO multi-core multiplier was present in the string!
  const singleAreaRegex = /(\d+(?:\.\d+)?)\s*(?:mm2|sqmm|mm²)/i;
  const matchArea = clean.match(singleAreaRegex);
  if (matchArea) {
    const size = parseFloat(matchArea[1]);
    const item06 = catalog.find(c => c.category === '1C_06_1KV_FLEX' && Math.abs(c.size_mm2 - size) < 0.01);
    if (item06) return item06.od_mm;
    const item450 = catalog.find(c => c.category === '1C_450_750V_FLEX' && Math.abs(c.size_mm2 - size) < 0.01);
    if (item450) return item450.od_mm;
  }

  return null;
}
