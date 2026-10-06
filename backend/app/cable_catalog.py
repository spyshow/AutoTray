"""Manufacturer Technical Handbook Cable Catalog (Pages 1 to 5).

Technical standards:
- IEC 60227 & BS 6004: 450/750V Single Core (Solid/Stranded & Flexible)
- IEC 60502: 0.6/1kV Single-Core & Multi-Core (2-Core, 3-Core, 4-Core, 5-Core)
"""

import re
from typing import Dict, Any, List, Optional

LOW_VOLTAGE_CABLE_CATALOG: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # PAGE 1: 450/750 V Single Core Solid or Stranded Copper Conductor, Cu/PVC (IEC 60227 & BS 6004)
    # -------------------------------------------------------------------------
    {"code": "CPD-S001-U04", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 1.5, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x1.5 mm² re", "od_mm": 2.8, "weight_kg_km": 20, "current_air_a": 17},
    {"code": "CPD-T001-U04", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 1.5, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x1.5 mm² rm", "od_mm": 3.0, "weight_kg_km": 21, "current_air_a": 17},
    {"code": "CPD-S001-U05", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 2.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x2 mm² re", "od_mm": 3.2, "weight_kg_km": 27, "current_air_a": 19},
    {"code": "CPD-T001-U05", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 2.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x2 mm² rm", "od_mm": 3.4, "weight_kg_km": 28, "current_air_a": 19},
    {"code": "CPD-S001-U06", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 2.5, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x2.5 mm² re", "od_mm": 3.4, "weight_kg_km": 31, "current_air_a": 24},
    {"code": "CPD-T001-U06", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 2.5, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x2.5 mm² rm", "od_mm": 3.6, "weight_kg_km": 33, "current_air_a": 24},
    {"code": "CPD-S001-U07", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 3.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x3 mm² re", "od_mm": 3.6, "weight_kg_km": 37, "current_air_a": 27},
    {"code": "CPD-T001-U07", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 3.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x3 mm² rm", "od_mm": 3.8, "weight_kg_km": 39, "current_air_a": 27},
    {"code": "CPD-S001-U08", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 4.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x4 mm² re", "od_mm": 3.9, "weight_kg_km": 47, "current_air_a": 32},
    {"code": "CPD-T001-U08", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 4.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x4 mm² rm", "od_mm": 4.2, "weight_kg_km": 50, "current_air_a": 32},
    {"code": "CPD-S001-U09", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 6.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x6 mm² re", "od_mm": 4.4, "weight_kg_km": 68, "current_air_a": 40},
    {"code": "CPD-T001-U09", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 6.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x6 mm² rm", "od_mm": 4.7, "weight_kg_km": 71, "current_air_a": 40},
    {"code": "CPD-T001-U10", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 10.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x10 mm² rm", "od_mm": 6.1, "weight_kg_km": 117, "current_air_a": 57},
    {"code": "CPD-T001-U11", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 16.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x16 mm² rm", "od_mm": 7.1, "weight_kg_km": 177, "current_air_a": 76},
    {"code": "CPD-T001-U12", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 25.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x25 mm² rm", "od_mm": 8.8, "weight_kg_km": 278, "current_air_a": 103},
    {"code": "CPD-T001-U13", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 35.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x35 mm² rm", "od_mm": 9.9, "weight_kg_km": 371, "current_air_a": 128},
    {"code": "CPD-T001-U14", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 50.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x50 mm² rm", "od_mm": 11.8, "weight_kg_km": 514, "current_air_a": 156},
    {"code": "CPD-T001-U15", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 70.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x70 mm² rm", "od_mm": 13.5, "weight_kg_km": 711, "current_air_a": 200},
    {"code": "CPD-T001-U16", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 95.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x95 mm² rm", "od_mm": 15.7, "weight_kg_km": 967, "current_air_a": 251},
    {"code": "CPD-T001-U17", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 120.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x120 mm² rm", "od_mm": 17.4, "weight_kg_km": 1240, "current_air_a": 293},
    {"code": "CPD-T001-U18", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 150.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x150 mm² rm", "od_mm": 19.4, "weight_kg_km": 1500, "current_air_a": 335},
    {"code": "CPD-T001-U19", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 185.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x185 mm² rm", "od_mm": 21.5, "weight_kg_km": 1852, "current_air_a": 390},
    {"code": "CPD-T001-U20", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 240.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x240 mm² rm", "od_mm": 24.7, "weight_kg_km": 2457, "current_air_a": 471},
    {"code": "CPD-T001-U30", "category": "1C_450_750V_BUILDING", "category_label": "Single Core Building Wire (Solid/Stranded)", "voltage": "450/750 V", "cores": 1, "size_mm2": 300.0, "conductor_type": "Solid/Stranded", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x300 mm² rm", "od_mm": 27.2, "weight_kg_km": 2977, "current_air_a": 540},

    # -------------------------------------------------------------------------
    # PAGE 2: 450/750 V Single Core Flexible Copper Conductor, Cu/PVC (IEC 60227 & BS 6004)
    # -------------------------------------------------------------------------
    {"code": "CPD-F001-U04", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x1.5 mm² Flex", "od_mm": 3.0, "weight_kg_km": 21, "current_air_a": 17},
    {"code": "CPD-F001-U06", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 2.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x2.5 mm² Flex", "od_mm": 3.7, "weight_kg_km": 34, "current_air_a": 24},
    {"code": "CPD-F001-U08", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 4.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x4 mm² Flex", "od_mm": 4.5, "weight_kg_km": 50, "current_air_a": 32},
    {"code": "CPD-F001-U09", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 6.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x6 mm² Flex", "od_mm": 5.1, "weight_kg_km": 71, "current_air_a": 40},
    {"code": "CPD-F001-U10", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 10.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x10 mm² Flex", "od_mm": 6.9, "weight_kg_km": 120, "current_air_a": 57},
    {"code": "CPD-F001-U11", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 16.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x16 mm² Flex", "od_mm": 7.6, "weight_kg_km": 179, "current_air_a": 76},
    {"code": "CPD-F001-U12", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 25.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x25 mm² Flex", "od_mm": 9.5, "weight_kg_km": 276, "current_air_a": 103},
    {"code": "CPD-F001-U13", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 35.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x35 mm² Flex", "od_mm": 11.0, "weight_kg_km": 375, "current_air_a": 128},
    {"code": "CPD-F001-U14", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 50.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x50 mm² Flex", "od_mm": 12.6, "weight_kg_km": 542, "current_air_a": 156},
    {"code": "CPD-F001-U15", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 70.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x70 mm² Flex", "od_mm": 14.6, "weight_kg_km": 733, "current_air_a": 200},
    {"code": "CPD-F001-U16", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 95.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x95 mm² Flex", "od_mm": 16.8, "weight_kg_km": 957, "current_air_a": 251},
    {"code": "CPD-F001-U17", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 120.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x120 mm² Flex", "od_mm": 18.9, "weight_kg_km": 1243, "current_air_a": 293},
    {"code": "CPD-F001-U18", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 150.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x150 mm² Flex", "od_mm": 21.2, "weight_kg_km": 1548, "current_air_a": 335},
    {"code": "CPD-F001-U19", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 185.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x185 mm² Flex", "od_mm": 23.4, "weight_kg_km": 1895, "current_air_a": 390},
    {"code": "CPD-F001-U20", "category": "1C_450_750V_FLEX", "category_label": "Single Core Flexible (450/750V)", "voltage": "450/750 V", "cores": 1, "size_mm2": 240.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC", "standard": "IEC 60227 & BS 6004", "designation": "1x240 mm² Flex", "od_mm": 26.7, "weight_kg_km": 2400, "current_air_a": 471},

    # -------------------------------------------------------------------------
    # PAGE 3: 0.6/1 kV Single Core Flexible Copper, Cu/PVC/PVC Sheathed (IEC 60502)
    # -------------------------------------------------------------------------
    {"code": "CP1-F101-U08", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 4.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x4 mm²", "od_mm": 6.7, "weight_kg_km": 80, "current_air_a": 29},
    {"code": "CP1-F101-U09", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 6.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x6 mm²", "od_mm": 7.5, "weight_kg_km": 105, "current_air_a": 38},
    {"code": "CP1-F101-U10", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 10.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x10 mm²", "od_mm": 8.3, "weight_kg_km": 150, "current_air_a": 51},
    {"code": "CP1-F101-U11", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 16.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x16 mm²", "od_mm": 9.2, "weight_kg_km": 205, "current_air_a": 65},
    {"code": "CP1-F101-U12", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 25.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x25 mm²", "od_mm": 11.1, "weight_kg_km": 310, "current_air_a": 90},
    {"code": "CP1-F101-U13", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 35.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x35 mm²", "od_mm": 11.9, "weight_kg_km": 405, "current_air_a": 110},
    {"code": "CP1-F101-U14", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 50.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x50 mm²", "od_mm": 14.0, "weight_kg_km": 565, "current_air_a": 135},
    {"code": "CP1-F101-U15", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 70.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x70 mm²", "od_mm": 15.4, "weight_kg_km": 780, "current_air_a": 170},
    {"code": "CP1-F101-U16", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 95.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x95 mm²", "od_mm": 17.3, "weight_kg_km": 1025, "current_air_a": 210},
    {"code": "CP1-F101-U17", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 120.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x120 mm²", "od_mm": 19.7, "weight_kg_km": 1285, "current_air_a": 245},
    {"code": "CP1-F101-U18", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 150.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x150 mm²", "od_mm": 22.0, "weight_kg_km": 1600, "current_air_a": 280},
    {"code": "CP1-F101-U19", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 185.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x185 mm²", "od_mm": 25.0, "weight_kg_km": 1995, "current_air_a": 320},
    {"code": "CP1-F101-U20", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 240.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x240 mm²", "od_mm": 29.7, "weight_kg_km": 2550, "current_air_a": 385},
    {"code": "CP1-F101-U30", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 300.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x300 mm²", "od_mm": 32.6, "weight_kg_km": 3260, "current_air_a": 450},
    {"code": "CP1-F101-U40", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 400.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x400 mm²", "od_mm": 37.2, "weight_kg_km": 4245, "current_air_a": 520},
    {"code": "CP1-F101-U50", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 500.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x500 mm²", "od_mm": 42.1, "weight_kg_km": 5340, "current_air_a": 600},
    {"code": "CP1-F101-U60", "category": "1C_06_1KV_FLEX", "category_label": "Single Core Sheathed 0.6/1kV", "voltage": "0.6/1 kV", "cores": 1, "size_mm2": 630.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "1x630 mm²", "od_mm": 46.6, "weight_kg_km": 6890, "current_air_a": 680},

    # -------------------------------------------------------------------------
    # PAGE 4: 0.6/1 kV Multi-Core (Two Cores), Cu/PVC/PVC Flexible (IEC 60502)
    # -------------------------------------------------------------------------
    {"code": "CP1-F102-U04", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x1.5 mm²", "od_mm": 9.0, "weight_kg_km": 125, "current_air_a": 20},
    {"code": "CP1-F102-U06", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 2.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x2.5 mm²", "od_mm": 10.0, "weight_kg_km": 160, "current_air_a": 28},
    {"code": "CP1-F102-U08", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 4.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x4 mm²", "od_mm": 11.8, "weight_kg_km": 225, "current_air_a": 39},
    {"code": "CP1-F102-U09", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 6.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x6 mm²", "od_mm": 13.4, "weight_kg_km": 295, "current_air_a": 50},
    {"code": "CP1-F102-U10", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 10.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x10 mm²", "od_mm": 15.5, "weight_kg_km": 345, "current_air_a": 66},
    {"code": "CP1-F102-U11", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 16.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x16 mm²", "od_mm": 17.3, "weight_kg_km": 470, "current_air_a": 88},
    {"code": "CP1-F102-U12", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 25.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x25 mm²", "od_mm": 21.1, "weight_kg_km": 710, "current_air_a": 116},
    {"code": "CP1-F102-U13", "category": "2C_06_1KV", "category_label": "2-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 35.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x35 mm²", "od_mm": 22.7, "weight_kg_km": 920, "current_air_a": 143},

    # -------------------------------------------------------------------------
    # PAGE 4: 0.6/1 kV Multi-Core (Three Cores), Cu/PVC/PVC Flexible (IEC 60502)
    # -------------------------------------------------------------------------
    {"code": "CP1-F103-U04", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x1.5 mm²", "od_mm": 9.5, "weight_kg_km": 145, "current_air_a": 18},
    {"code": "CP1-F103-U06", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 2.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x2.5 mm²", "od_mm": 10.6, "weight_kg_km": 190, "current_air_a": 22},
    {"code": "CP1-F103-U08", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 4.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x4 mm²", "od_mm": 12.5, "weight_kg_km": 270, "current_air_a": 31},
    {"code": "CP1-F103-U09", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 6.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x6 mm²", "od_mm": 14.2, "weight_kg_km": 355, "current_air_a": 39},
    {"code": "CP1-F103-U10", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 10.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x10 mm²", "od_mm": 16.5, "weight_kg_km": 460, "current_air_a": 53},
    {"code": "CP1-F103-U11", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 16.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x16 mm²", "od_mm": 18.4, "weight_kg_km": 635, "current_air_a": 72},
    {"code": "CP1-F103-U12", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 25.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x25 mm²", "od_mm": 22.5, "weight_kg_km": 965, "current_air_a": 94},
    {"code": "CP1-F103-U13", "category": "3C_06_1KV", "category_label": "3-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 3, "size_mm2": 35.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "3x35 mm²", "od_mm": 24.3, "weight_kg_km": 1275, "current_air_a": 110},

    # -------------------------------------------------------------------------
    # PAGE 5: 0.6/1 kV Multi-Core (Four Cores), Cu/PVC/PVC Flexible (IEC 60502)
    # -------------------------------------------------------------------------
    {"code": "CP1-F104-U04", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x1.5 mm²", "od_mm": 10.3, "weight_kg_km": 175, "current_air_a": 18},
    {"code": "CP1-F104-U06", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 2.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x2.5 mm²", "od_mm": 11.5, "weight_kg_km": 225, "current_air_a": 22},
    {"code": "CP1-F104-U08", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 4.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x4 mm²", "od_mm": 13.7, "weight_kg_km": 330, "current_air_a": 31},
    {"code": "CP1-F104-U09", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 6.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x6 mm²", "od_mm": 15.6, "weight_kg_km": 435, "current_air_a": 39},
    {"code": "CP1-F104-U10", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 10.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x10 mm²", "od_mm": 18.1, "weight_kg_km": 580, "current_air_a": 53},
    {"code": "CP1-F104-U11", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 16.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x16 mm²", "od_mm": 20.2, "weight_kg_km": 810, "current_air_a": 72},
    {"code": "CP1-F104-U12", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 25.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x25 mm²", "od_mm": 24.8, "weight_kg_km": 1245, "current_air_a": 94},
    {"code": "CP1-F104-U13", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 35.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x35 mm²", "od_mm": 26.8, "weight_kg_km": 1645, "current_air_a": 110},
    {"code": "CP1-F104-U14", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 50.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x50 mm²", "od_mm": 32.1, "weight_kg_km": 2305, "current_air_a": 138},
    {"code": "CP1-F104-U15", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 70.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x70 mm²", "od_mm": 35.6, "weight_kg_km": 3220, "current_air_a": 171},
    {"code": "CP1-F104-U16", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 95.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x95 mm²", "od_mm": 40.2, "weight_kg_km": 4250, "current_air_a": 209},
    {"code": "CP1-F104-U17", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 120.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x120 mm²", "od_mm": 46.0, "weight_kg_km": 5320, "current_air_a": 242},
    {"code": "CP1-F104-U18", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 150.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x150 mm²", "od_mm": 51.4, "weight_kg_km": 6640, "current_air_a": 275},
    {"code": "CP1-F104-U19", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 185.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x185 mm²", "od_mm": 58.4, "weight_kg_km": 8275, "current_air_a": 314},
    {"code": "CP1-F104-U20", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 240.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x240 mm²", "od_mm": 70.2, "weight_kg_km": 10655, "current_air_a": 374},
    {"code": "CP1-F104-U30", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 300.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x300 mm²", "od_mm": 77.1, "weight_kg_km": 13630, "current_air_a": 440},
    {"code": "CP1-F104-U40", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 400.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x400 mm²", "od_mm": 88.2, "weight_kg_km": 17775, "current_air_a": 507},
    {"code": "CP1-F104-U50", "category": "4C_06_1KV", "category_label": "4-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 4, "size_mm2": 500.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "4x500 mm²", "od_mm": 100.0, "weight_kg_km": 22400, "current_air_a": 566},

    # -------------------------------------------------------------------------
    # PAGE 5: 0.6/1 kV Multi-Core (Five Cores), Cu/PVC/PVC Flexible (IEC 60502)
    # -------------------------------------------------------------------------
    {"code": "CP1-F1A5-U13", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 35.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x35 mm²", "od_mm": 29.7, "weight_kg_km": 2040, "current_air_a": 110},
    {"code": "CP1-F1A5-U14", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 50.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x50 mm²", "od_mm": 35.6, "weight_kg_km": 2865, "current_air_a": 138},
    {"code": "CP1-F1A5-U15", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 70.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x70 mm²", "od_mm": 39.7, "weight_kg_km": 4020, "current_air_a": 171},
    {"code": "CP1-F1A5-U16", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 95.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x95 mm²", "od_mm": 44.3, "weight_kg_km": 5270, "current_air_a": 209},
    {"code": "CP1-F1A5-U17", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 120.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x120 mm²", "od_mm": 51.2, "weight_kg_km": 6640, "current_air_a": 242},
    {"code": "CP1-F1A5-U18", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 150.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x150 mm²", "od_mm": 57.1, "weight_kg_km": 8260, "current_air_a": 275},
    {"code": "CP1-F1A5-U19", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 185.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x185 mm²", "od_mm": 64.8, "weight_kg_km": 10285, "current_air_a": 314},
    {"code": "CP1-F1A5-U20", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 240.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x240 mm²", "od_mm": 78.1, "weight_kg_km": 13270, "current_air_a": 374},
    {"code": "CP1-F1A5-U30", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 300.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x300 mm²", "od_mm": 85.6, "weight_kg_km": 16935, "current_air_a": 440},
    {"code": "CP1-F1A5-U40", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 400.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x400 mm²", "od_mm": 98.1, "weight_kg_km": 22140, "current_air_a": 507},
    {"code": "CP1-F1A5-U50", "category": "5C_06_1KV", "category_label": "5-Core Multicore 0.6/1kV", "voltage": "0.6/1 kV", "cores": 5, "size_mm2": 500.0, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "5x500 mm²", "od_mm": 111.2, "weight_kg_km": 27885, "current_air_a": 566},
    # Standard Multi-Core Flexible Control Cables (DIN EN 50525 / VDE 0281 / IEC 60502, e.g. YSLY-JZ / Ölflex Classic 110)
    {"code": "CTRL-02-050", "category": "MULTI_CTRL", "category_label": "Multi-Core Control (300/500V)", "voltage": "0.6/1 kV", "cores": 2, "size_mm2": 0.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "2x0.5 mm²", "od_mm": 5.6, "weight_kg_km": 42, "current_air_a": 6},
    {"code": "CTRL-07-150", "category": "MULTI_CTRL", "category_label": "Multi-Core Control (300/500V)", "voltage": "0.6/1 kV", "cores": 7, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "7x1.5 mm²", "od_mm": 11.5, "weight_kg_km": 220, "current_air_a": 15},
    {"code": "CTRL-10-150", "category": "MULTI_CTRL", "category_label": "Multi-Core Control (300/500V)", "voltage": "0.6/1 kV", "cores": 10, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "10x1.5 mm²", "od_mm": 13.8, "weight_kg_km": 295, "current_air_a": 13},
    {"code": "CTRL-12-150", "category": "MULTI_CTRL", "category_label": "Multi-Core Control (300/500V)", "voltage": "0.6/1 kV", "cores": 12, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "12x1.5 mm²", "od_mm": 14.8, "weight_kg_km": 340, "current_air_a": 12},
    {"code": "CTRL-18-150", "category": "MULTI_CTRL", "category_label": "Multi-Core Control (300/500V)", "voltage": "0.6/1 kV", "cores": 18, "size_mm2": 1.5, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "18x1.5 mm²", "od_mm": 17.2, "weight_kg_km": 490, "current_air_a": 10},
    {"code": "CTRL-18-075", "category": "MULTI_CTRL", "category_label": "Multi-Core Control (300/500V)", "voltage": "0.6/1 kV", "cores": 18, "size_mm2": 0.75, "conductor_type": "Flexible", "insulation_sheath": "Cu/PVC/PVC", "standard": "IEC 60502", "designation": "18x0.75 mm²", "od_mm": 13.9, "weight_kg_km": 310, "current_air_a": 8},
]


def lookup_catalog_cable(raw_type: str) -> Optional[Dict[str, Any]]:
    """Intelligent Catalog Cable Lookup returning matched catalog item."""
    if not raw_type:
        return None

    clean = re.sub(r"(\d+),(\d+)", r"\1.\2", str(raw_type).strip())
    lower = clean.lower()

    # 1. Direct Product Code match
    for item in LOW_VOLTAGE_CABLE_CATALOG:
        code = item.get("code")
        if code and code.lower() == lower:
            return item

    # 2. Multi-Core Pattern Extraction: (cores) x (size in mm2)
    # Matches: 4x50, 4 x 50, 4cx50, 4c x 50, 4*50, 4/50, 4x2.5, 2Xx1.5, 4Gx1.5, 12x1.5, etc.
    multi_core_match = re.search(r"(?:^|[^\d])(\d+)\s*(?:c|core|cores)?\s*(?:[gG]\s*[xX*×]?|[xX*×]{1,2}|[\*×\/])\s*(\d+(?:\.\d+)?)", clean, re.IGNORECASE)
    if multi_core_match:
        try:
            cores = int(multi_core_match.group(1))
            size = float(multi_core_match.group(2))
            if cores >= 1 and size > 0:
                target_cat = f"{cores}C_06_1KV"
                if cores == 1:
                    target_cat = "1C_06_1KV_FLEX"
                
                for item in LOW_VOLTAGE_CABLE_CATALOG:
                    if item["category"] == target_cat and abs(item["size_mm2"] - size) < 0.01:
                        return item

                # If 1C not in 0.6/1kV flex, check 450/750V
                if cores == 1:
                    for item in LOW_VOLTAGE_CABLE_CATALOG:
                        if item["category"] == "1C_450_750V_FLEX" and abs(item["size_mm2"] - size) < 0.01:
                            return item

                # Check general catalog for matching cores and size (covers MULTI_CTRL: 7C, 10C, 12C, 18C, etc.)
                for item in LOW_VOLTAGE_CABLE_CATALOG:
                    if item.get("cores") == cores and abs(item["size_mm2"] - size) < 0.01:
                        return item
        except (ValueError, TypeError):
            pass

        # IMPORTANT: If it matched a multi-core pattern (e.g. 12x1.5),
        # NEVER fall through to single-core cross-section matching (which would wrongly match 1.5 mm² to a single 3mm wire)!
        return None

    # 3. Single-Core Cross-Sectional Area Only: e.g. '240mm2', '185 mm2', '50mm2'
    # ONLY executed if no multi-core pattern was matched!
    single_area_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:mm2|sqmm|mm²)", clean, re.IGNORECASE)
    if single_area_match:
        try:
            size = float(single_area_match.group(1))
            for item in LOW_VOLTAGE_CABLE_CATALOG:
                if item["category"] == "1C_06_1KV_FLEX" and abs(item["size_mm2"] - size) < 0.01:
                    return item
            for item in LOW_VOLTAGE_CABLE_CATALOG:
                if item["category"] == "1C_450_750V_FLEX" and abs(item["size_mm2"] - size) < 0.01:
                    return item
        except (ValueError, TypeError):
            pass

    return None


def lookup_catalog_cable_od(raw_type: str) -> Optional[float]:
    """Return catalog OD in mm if matched, else None."""
    item = lookup_catalog_cable(raw_type)
    return float(item["od_mm"]) if item and "od_mm" in item else None


def lookup_catalog_cable_weight_kg_km(raw_type: str) -> Optional[float]:
    """Return catalog weight in kg/km if matched, else None."""
    item = lookup_catalog_cable(raw_type)
    return float(item["weight_kg_km"]) if item and "weight_kg_km" in item else None
