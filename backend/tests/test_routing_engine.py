import pytest
from app.models import CalculationParameters, Branch, Cable, BranchStatus
from app.routing_engine import solve_routing_and_sizing, STANDARD_COMMERCIAL_WIDTHS, find_node_suggestion


def test_standard_commercial_widths_list():
    assert STANDARD_COMMERCIAL_WIDTHS == [50, 75, 100, 150, 200, 300, 400, 450, 500, 600, 700]


def test_single_power_cable_sizing():
    params = CalculationParameters(spare_margin_pct=20.0, control_fill_pct=40.0, default_tray_height_mm=60.0)
    branches = [
        Branch(branch_id="BR_01", node_from="A", node_to="B", level="Level 1", length_m=10.0)
    ]
    # OD = 30mm, count = 1.
    # Power width = 30 * 2 = 60mm.
    # Spare margin 20% -> 60 * 1.2 = 72mm.
    # Next standard commercial width >= 72 in [50, 75, 100, ...] is 75mm.
    cables = [
        Cable(cable_tag="C_PWR_1", source_node="A", dest_node="B", cable_type="power", od_mm=30.0, count=1)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)

    assert resp.summary.total_cables_routed == 1
    assert len(resp.summary.unrouted_cables) == 0
    b_res = resp.branches[0]
    assert b_res.branch_id == "BR_01"
    assert b_res.power_width_mm == 60.0
    assert b_res.calculated_width_mm == 72.0
    assert b_res.recommended_commercial_width_mm == 75
    assert b_res.status == BranchStatus.OK.value
    assert b_res.fill_ratio_pct == 96.0


def test_multilayer_control_cable_sizing():
    # OD = 10mm, count = 10.
    # Area = 10 * (pi * 10^2 / 4) = 10 * 78.5398 = 785.398 mm^2.
    # Tray height = 60mm, Fill factor = 40% (0.40).
    # Width_control = 785.398 / (60 * 0.4) = 785.398 / 24 = 32.72 mm.
    # Spare margin 0% -> 32.72 mm.
    # Next standard width >= 32.72 in [50, 75, ...] is 50 mm.
    params = CalculationParameters(spare_margin_pct=0.0, control_fill_pct=40.0, default_tray_height_mm=60.0)
    branches = [
        Branch(branch_id="BR_CTRL", node_from="X", node_to="Y", level="Level 1", length_m=5.0)
    ]
    cables = [
        Cable(cable_tag="C_CTRL_1", source_node="X", dest_node="Y", cable_type="control", od_mm=10.0, count=10)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    b_res = resp.branches[0]
    assert b_res.power_cables_count == 0
    assert b_res.control_cables_count == 10
    assert pytest.approx(b_res.control_width_mm, 0.1) == 32.72
    assert b_res.recommended_commercial_width_mm == 50


def test_metallic_divider_applied():
    # Power and control present, divider enabled
    params = CalculationParameters(
        spare_margin_pct=0.0,
        control_fill_pct=40.0,
        default_tray_height_mm=60.0,
        add_metallic_divider=True,
        divider_width_mm=15.0,
    )
    branches = [
        Branch(branch_id="BR_MIX", node_from="A", node_to="B", level="Level 1", length_m=8.0)
    ]
    cables = [
        Cable(cable_tag="C_PWR", source_node="A", dest_node="B", cable_type="power", od_mm=25.0, count=2),
        Cable(cable_tag="C_CTRL", source_node="A", dest_node="B", cable_type="control", od_mm=12.0, count=5),
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    b_res = resp.branches[0]
    assert b_res.barrier_width_mm == 15.0
    expected_raw = b_res.power_width_mm + b_res.control_width_mm + 15.0
    assert pytest.approx(b_res.calculated_width_mm, 0.1) == expected_raw


def test_multi_level_riser_routing():
    # 3-level plant routing test:
    # Level 1: L1_START -> L1_RISER_BASE (length: 10m)
    # Riser: L1_RISER_BASE -> L2_RISER_TOP (vertical, length: 5m)
    # Level 2: L2_RISER_TOP -> L2_LOAD (length: 8m)
    params = CalculationParameters()
    branches = [
        Branch(branch_id="TRAY_L1", node_from="L1_START", node_to="L1_RISER_BASE", level="Level 1", length_m=10.0),
        Branch(branch_id="RISER_V1", node_from="L1_RISER_BASE", node_to="L2_RISER_TOP", level="Transition", branch_type="vertical", length_m=5.0),
        Branch(branch_id="TRAY_L2", node_from="L2_RISER_TOP", node_to="L2_LOAD", level="Level 2", length_m=8.0),
    ]
    cables = [
        Cable(cable_tag="FEEDER_01", source_node="L1_START", dest_node="L2_LOAD", cable_type="power", od_mm=20.0, count=1)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)

    assert resp.summary.total_cables_routed == 1
    routed_c = resp.cables[0]
    assert routed_c.status == "ROUTED"
    assert routed_c.total_length_m == 23.0  # 10 + 5 + 8
    assert routed_c.path_branches == ["TRAY_L1", "RISER_V1", "TRAY_L2"]

    for b in resp.branches:
        assert "FEEDER_01" in b.cables_routed


def test_overfill_split_tier():
    # Force calculated width > 700mm
    params = CalculationParameters(spare_margin_pct=10.0)
    branches = [
        Branch(branch_id="BR_HEAVY", node_from="A", node_to="B", level="Level 1", length_m=10.0)
    ]
    cables = [
        Cable(cable_tag="HEAVY_FEEDER", source_node="A", dest_node="B", cable_type="power", od_mm=40.0, count=20)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    b_res = resp.branches[0]
    assert b_res.status == BranchStatus.OVERFILL_SPLIT_TIER.value
    assert b_res.recommended_commercial_width_mm == 700
    assert b_res.fill_ratio_pct > 100.0
    assert resp.summary.overfilled_branches_count == 1


def test_cable_od_fallback_to_defaults():
    # Cable without OD specified should resolve from default parameters
    params = CalculationParameters(
        spare_margin_pct=0.0,
        default_power_od_mm=30.0,
        default_control_od_mm=12.0,
        default_global_od_mm=15.0,
    )
    branches = [
        Branch(branch_id="BR_DEF", node_from="N1", node_to="N2", level="Level 1", length_m=10.0)
    ]
    # Cable has od_mm=None -> should resolve to 30.0mm (power)
    cables = [
        Cable(cable_tag="C_NO_OD", source_node="N1", dest_node="N2", cable_type="power", od_mm=None, count=1)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.summary.total_cables_routed == 1
    c_res = resp.cables[0]
    assert c_res.od_mm == 30.0
    b_res = resp.branches[0]
    # Power width = 30 * 2 = 60mm -> next standard width is 75mm
    assert b_res.power_width_mm == 60.0
    assert b_res.recommended_commercial_width_mm == 75


def test_custom_od_by_type_override():
    params = CalculationParameters(
        spare_margin_pct=0.0,
        custom_od_by_type={"PROFINET_BUS": 9.2}
    )
    branches = [
        Branch(branch_id="BR_BUS", node_from="N1", node_to="N2", level="Level 1", length_m=10.0)
    ]
    cables = [
        Cable(cable_tag="C_BUS_1", source_node="N1", dest_node="N2", cable_type="PROFINET_BUS", od_mm=None, count=1)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.cables[0].od_mm == 9.2


def test_unrouted_cable_no_path():
    # Disconnected components
    params = CalculationParameters()
    branches = [
        Branch(branch_id="BR_1", node_from="A", node_to="B", level="Level 1", length_m=10.0),
        Branch(branch_id="BR_2", node_from="C", node_to="D", level="Level 2", length_m=10.0),
    ]
    cables = [
        Cable(cable_tag="C_ORPHAN", source_node="A", dest_node="D", cable_type="power", od_mm=15.0)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.summary.total_cables_routed == 0
    assert "C_ORPHAN" in resp.summary.unrouted_cables
    # Disconnected nodes must cleanly contain the isolated component nodes
    assert "C" in resp.diagnostics.disconnected_nodes or "D" in resp.diagnostics.disconnected_nodes


def test_whitespace_trimming_on_endpoints():
    params = CalculationParameters()
    branches = [
        Branch(branch_id="BR_WS", node_from="  PANEL_A  ", node_to="  JUNC_B\n", level="Level 1", length_m=10.0)
    ]
    cables = [
        Cable(cable_tag="C_WS", source_node="PANEL_A", dest_node="JUNC_B", cable_type="power", od_mm=15.0, count=1)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.summary.total_cables_routed == 1
    assert resp.branches[0].cable_count == 1
    assert "C_WS" in resp.branches[0].cables_routed


def test_zero_tray_height_protection():
    params = CalculationParameters(default_tray_height_mm=60.0)
    # Branch with 0 or negative tray height must not cause ZeroDivisionError
    branches = [
        Branch(branch_id="BR_ZERO_H", node_from="A", node_to="B", length_m=5.0, tray_height_mm=0.0)
    ]
    cables = [
        Cable(cable_tag="C_CTRL", source_node="A", dest_node="B", cable_type="control", od_mm=10.0, count=5)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.summary.total_cables_routed == 1
    assert resp.branches[0].calculated_width_mm > 0


def test_parallel_branches_shortest_selected():
    params = CalculationParameters()
    # Two branches between A and B: BR_LONG (20m) and BR_SHORT (5m)
    branches = [
        Branch(branch_id="BR_LONG", node_from="A", node_to="B", length_m=20.0),
        Branch(branch_id="BR_SHORT", node_from="A", node_to="B", length_m=5.0),
    ]
    cables = [
        Cable(cable_tag="C1", source_node="A", dest_node="B", cable_type="power", od_mm=10.0, count=1)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.summary.total_cables_routed == 1
    assert resp.cables[0].total_length_m == 5.0
    assert resp.cables[0].path_branches == ["BR_SHORT"]


def test_alias_choices_support():
    # Test that alternative field aliases from industrial schemas work
    b = Branch.model_validate({
        "id": "BR_ALIAS",
        "from": "NODE_1",
        "to": "NODE_2",
        "type": "horizontal",
        "length": 15.0,
        "height": 75.0,
    })
    assert b.branch_id == "BR_ALIAS"
    assert b.node_from == "NODE_1"
    assert b.node_to == "NODE_2"
    assert b.length_m == 15.0
    assert b.tray_height_mm == 75.0

    c = Cable.model_validate({
        "tag": "C_ALIAS",
        "from": "NODE_1",
        "to": "NODE_2",
        "type": "400V Feeder",
        "od": 28.0,
        "qty": 3,
    })
    assert c.cable_tag == "C_ALIAS"
    assert c.cable_type == "400V Feeder"
    assert c.od_mm == 28.0
    assert c.count == 3


def test_empty_branch():
    params = CalculationParameters()
    branches = [
        Branch(branch_id="BR_EMPTY", node_from="A", node_to="B", level="Level 1", length_m=10.0)
    ]
    cables = [
        Cable(cable_tag="C_OTHER", source_node="C", dest_node="D", cable_type="power", od_mm=10.0)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    b_res = resp.branches[0]
    assert b_res.status == BranchStatus.EMPTY.value
    assert b_res.cable_count == 0
    assert b_res.fill_ratio_pct == 0.0


def test_bill_of_materials_generation():
    params = CalculationParameters(add_metallic_divider=True)
    branches = [
        Branch(branch_id="BR_01", node_from="A", node_to="B", level="Level 1", length_m=9.0),
        Branch(branch_id="BR_02", node_from="B", node_to="C", level="Level 1", length_m=6.0),
        Branch(branch_id="RISER_01", node_from="C", node_to="D", level="Transition", branch_type="vertical", length_m=3.0),
    ]
    cables = [
        Cable(cable_tag="C_PWR_1", source_node="A", dest_node="D", cable_type="power", od_mm=25.0, count=1),
        Cable(cable_tag="C_CTRL_1", source_node="A", dest_node="D", cable_type="control", od_mm=12.0, count=2),
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.bom is not None
    bom = resp.bom

    # 9m + 6m + 3m = 18m total tray length
    assert bom.total_tray_length_m == 18.0
    # Standard 3m sections: 9m/3 + 6m/3 + 3m/3 = 3 + 2 + 1 = 6 sections (or aggregated)
    assert bom.total_sections_3m >= 6
    assert len(bom.trays) >= 1

    # Accessories
    acc_names = [a.item_name for a in bom.accessories]
    assert any("Splice Coupler" in name for name in acc_names)
    assert any("Support" in name for name in acc_names)
    # Since metallic divider is True and branches have power + control, divider accessory should be present
    assert any("Divider" in name for name in acc_names)

    # Cable summary: each cable route length is 18m
    # C_PWR_1 (count 1) = 18m, C_CTRL_1 (count 2) = 36m -> total 54m
    assert bom.total_cable_length_m == 54.0
    assert len(bom.cables_summary) == 2


def test_catalog_lookup_direct_patterns():
    from app.cable_catalog import lookup_catalog_cable_od, LOW_VOLTAGE_CABLE_CATALOG

    assert len(LOW_VOLTAGE_CABLE_CATALOG) >= 100
    assert lookup_catalog_cable_od("4x50") == 32.1
    assert lookup_catalog_cable_od("4X50 mm2") == 32.1
    assert lookup_catalog_cable_od("4C x 50 mm²") == 32.1
    assert lookup_catalog_cable_od("4x240") == 70.2
    assert lookup_catalog_cable_od("3x16") == 18.4
    assert lookup_catalog_cable_od("2x2.5") == 10.0
    assert lookup_catalog_cable_od("5x70") == 39.7
    assert lookup_catalog_cable_od("1x240") == 29.7
    assert lookup_catalog_cable_od("CP1-F104-U14") == 32.1
    # DIN / EPLAN conductor designations (Xx, Gx, comma decimals)
    assert lookup_catalog_cable_od("2Xx1.5") == 9.0
    assert lookup_catalog_cable_od("2Xx1,5 mm²") == 9.0
    assert lookup_catalog_cable_od("4Gx1,5 mm²") == 10.3
    assert lookup_catalog_cable_od("4Xx1,5 mm²") == 10.3
    assert lookup_catalog_cable_od("4Gx2,5 mm²") == 11.5
    # Multi-core flexible control cables
    assert lookup_catalog_cable_od("12x1.5") == 14.8
    assert lookup_catalog_cable_od("12Gx1,5 mm²") == 14.8
    assert lookup_catalog_cable_od("7Gx1,5 mm²") == 11.5
    assert lookup_catalog_cable_od("2Xx0,5 mm²") == 5.6
    # Multi-core unlisted must NEVER fall through to single-core building wire (3.0mm)
    assert lookup_catalog_cable_od("24x1.5 mm²") is None
    # Genuine single core building wire
    assert lookup_catalog_cable_od("1x1.5 mm²") == 3.0
    # Unknown designation returns None
    assert lookup_catalog_cable_od("NonExistentSpecialCable999") is None


def test_catalog_cable_in_routing_engine():
    """Cable without explicit OD uses handbook catalog OD for 4x50 (32.1mm)."""
    params = CalculationParameters(spare_margin_pct=20.0)
    branches = [
        Branch(branch_id="BR_CAT", node_from="A", node_to="B", level="Level 1", length_m=10.0)
    ]
    # Cable has no OD, but type is 4x50 (Power single layer)
    cables = [
        Cable(cable_tag="C_CAT_1", source_node="A", dest_node="B", cable_type="4x50", od_mm=None, count=1)
    ]
    resp = solve_routing_and_sizing(params, branches, cables)
    b_res = resp.branches[0]
    assert b_res.power_cables_count == 1
    # Power width = 32.1 * 2 = 64.2mm. + 20% spare = 77.04mm -> Commercial 100mm
    assert pytest.approx(b_res.power_width_mm, 0.1) == 64.2
    assert pytest.approx(b_res.calculated_width_mm, 0.1) == 77.04
    assert b_res.recommended_commercial_width_mm == 100


def test_catalog_precedence_hierarchy():
    """Verify precedence: Explicit OD > Custom Rule > Technical Catalog > Category Default."""
    branches = [
        Branch(branch_id="BR_01", node_from="A", node_to="B", level="Level 1", length_m=10.0)
    ]

    # Case 1: Explicit OD takes precedence over catalog (4x50 catalog is 32.1, but explicit is 20.0)
    params_default = CalculationParameters(spare_margin_pct=0.0)
    cables_explicit = [
        Cable(cable_tag="C1", source_node="A", dest_node="B", cable_type="4x50", od_mm=20.0, count=1)
    ]
    resp1 = solve_routing_and_sizing(params_default, branches, cables_explicit)
    assert resp1.branches[0].power_width_mm == 40.0  # 20 * 2

    # Case 2: Custom rule takes precedence over catalog (custom rule sets 4x50 to 22.0)
    params_custom = CalculationParameters(spare_margin_pct=0.0, custom_od_by_type={"4x50": 22.0})
    cables_no_od = [
        Cable(cable_tag="C2", source_node="A", dest_node="B", cable_type="4x50", od_mm=None, count=1)
    ]
    resp2 = solve_routing_and_sizing(params_custom, branches, cables_no_od)
    assert resp2.branches[0].power_width_mm == 44.0  # 22 * 2

    # Case 3: No custom rule -> resolves from catalog (4x50 = 32.1)
    resp3 = solve_routing_and_sizing(params_default, branches, cables_no_od)
    assert pytest.approx(resp3.branches[0].power_width_mm, 0.1) == 64.2  # 32.1 * 2


def test_single_core_power_trefoil_vs_flat():
    """Verify single-core power cable formations: Trefoil vs Flat Touching vs Flat Spaced."""
    branches = [
        Branch(branch_id="BR_01", node_from="A", node_to="B", level="Level 1", length_m=10.0, tray_height_mm=100.0)
    ]
    # 3 single core cables of 1x240 mm² (OD = 29.7 mm from catalog or explicit 30.0 mm)
    cables = [
        Cable(cable_tag="C_1C", source_node="A", dest_node="B", cable_type="1x240 mm²", od_mm=30.0, count=3, category="power")
    ]

    # 1. Trefoil ("trifoly"): 3 single-core cables bundled in triangle take 2 * OD = 60.0 mm
    params_trefoil = CalculationParameters(spare_margin_pct=0.0, single_core_power_formation="trefoil")
    resp_tri = solve_routing_and_sizing(params_trefoil, branches, cables)
    assert pytest.approx(resp_tri.branches[0].power_width_mm, 0.1) == 60.0

    # 2. Flat Touching ("near each other"): 3 cables laid touching side-by-side take 3 * 1.0 * OD = 90.0 mm
    params_touching = CalculationParameters(spare_margin_pct=0.0, single_core_power_formation="flat_touching")
    resp_flat = solve_routing_and_sizing(params_touching, branches, cables)
    assert pytest.approx(resp_flat.branches[0].power_width_mm, 0.1) == 90.0

    # 3. Flat Spaced: 3 cables laid with 1 OD clearance take 3 * 2.0 * OD = 180.0 mm
    params_spaced = CalculationParameters(spare_margin_pct=0.0, single_core_power_formation="flat_spaced")
    resp_spaced = solve_routing_and_sizing(params_spaced, branches, cables)
    assert pytest.approx(resp_spaced.branches[0].power_width_mm, 0.1) == 180.0


def test_single_core_trefoil_height_warning():
    """When a single-core trefoil bundle height exceeds the tray side height, emit a warning."""
    # Tray height 60mm, but cable OD = 35mm -> trefoil height = 35 * 1.866 = 65.3mm > 60mm
    branches = [
        Branch(branch_id="BR_LOW", node_from="A", node_to="B", level="Level 1", length_m=10.0, tray_height_mm=60.0)
    ]
    cables = [
        Cable(cable_tag="C_HIGH_PWR", source_node="A", dest_node="B", cable_type="1x300 mm²", od_mm=35.0, count=3, category="power", formation="trefoil")
    ]
    params = CalculationParameters(spare_margin_pct=0.0)
    resp = solve_routing_and_sizing(params, branches, cables)
    b_res = resp.branches[0]
    assert len(b_res.warnings) > 0
    assert any("Trefoil bundle height" in w and "exceeds tray height" in w for w in b_res.warnings)


def test_case_insensitive_and_whitespace_node_matching():
    """Branches defined as p101 -> p108 should match cables defined as P101 -> P108 with extra spaces."""
    branches = [
        Branch(branch_id="BR_101_108", node_from=" p101 ", node_to=" p108 ", level="Level 1", length_m=12.0)
    ]
    cables = [
        Cable(cable_tag="C_101", source_node="P101", dest_node="P108", cable_type="4x1.5 mm²", od_mm=10.3)
    ]
    resp = solve_routing_and_sizing(CalculationParameters(), branches, cables)
    assert len(resp.summary.unrouted_cables) == 0
    assert resp.summary.total_cables_routed == 1
    assert resp.branches[0].cable_count == 1
    assert resp.cables[0].status == "ROUTED"
    assert resp.cables[0].total_length_m == 12.0


def test_same_node_self_loop_branch_routing():
    """When a branch is explicitly defined from P101 to P101, cables P101 -> P101 route onto it."""
    branches = [
        Branch(branch_id="BR_P101_LOCAL", node_from="P101", node_to="P101", level="Level 1", length_m=2.5)
    ]
    cables = [
        Cable(cable_tag="C_INT_1", source_node="P101", dest_node="P101", cable_type="4x1.5 mm²", od_mm=10.3, count=2)
    ]
    resp = solve_routing_and_sizing(CalculationParameters(), branches, cables)
    assert len(resp.summary.unrouted_cables) == 0
    assert resp.branches[0].cable_count == 2
    assert len(resp.branches[0].cables_routed) == 1
    assert resp.cables[0].status == "ROUTED"
    assert resp.cables[0].path_branches == ["BR_P101_LOCAL"]
    assert resp.cables[0].total_length_m == 2.5


def test_same_node_local_panel_wiring_without_branch():
    """When cables are P101 -> P101 and no self-loop branch exists, they are classified as LOCAL (not unrouted error)."""
    branches = [
        Branch(branch_id="BR_MAIN", node_from="P101", node_to="P108", level="Level 1", length_m=10.0)
    ]
    cables = [
        Cable(cable_tag="C_LOCAL_1", source_node="P101", dest_node="P101", cable_type="4x1.5 mm²", od_mm=10.3)
    ]
    resp = solve_routing_and_sizing(CalculationParameters(), branches, cables)
    assert len(resp.summary.unrouted_cables) == 0
    assert resp.cables[0].status == "LOCAL"
    assert resp.cables[0].total_length_m == 0.0
    assert "Local panel wiring" in resp.cables[0].unrouted_reason


def test_unrouted_cable_typo_suggestion():
    """When cable has typo P181 instead of P108, the diagnostic suggestion points to P108."""
    branches = [
        Branch(branch_id="BR_01", node_from="P101", node_to="P108", level="Level 1", length_m=10.0)
    ]
    cables = [
        Cable(cable_tag="C_ERR", source_node="P101", dest_node="P181", cable_type="power", od_mm=15.0)
    ]
    resp = solve_routing_and_sizing(CalculationParameters(), branches, cables)
    assert "C_ERR" in resp.summary.unrouted_cables
    assert resp.cables[0].status == "UNROUTED"
    assert "P108" in resp.cables[0].unrouted_reason


def test_node_zero_padding_distinct_not_suggested_as_typo():
    """Verify nodes differing only in leading zero padding (e.g. N024 vs N24) are never suggested as typos."""
    # Direct find_node_suggestion checks
    assert find_node_suggestion("N024", {"N24"}) is None
    assert find_node_suggestion("N24", {"N024"}) is None
    assert find_node_suggestion("NODE_01", {"NODE_1"}) is None
    assert find_node_suggestion("P01", {"P1"}) is None

    # Legitimate typos are still suggested
    assert find_node_suggestion("P181", {"P108"}) == "P108"
    assert find_node_suggestion("N024", {"N025"}) == "N025"

    # End-to-end check in routing engine: cable targeting N024 where only N24 exists in branches
    branches = [
        Branch(branch_id="BR_01", node_from="P101", node_to="N24", level="Level 1", length_m=10.0)
    ]
    cables = [
        Cable(cable_tag="C_N024", source_node="P101", dest_node="N024", cable_type="power", od_mm=15.0)
    ]
    resp = solve_routing_and_sizing(CalculationParameters(), branches, cables)
    assert resp.cables[0].status == "UNROUTED"
    # Unrouted reason must NOT suggest N24 as a typo
    assert "Did you mean 'N24'" not in resp.cables[0].unrouted_reason
    assert "Endpoint missing in branch network: Dest 'N024'" in resp.cables[0].unrouted_reason


def test_panel_preservation_and_diagnostics():
    """Verify source_panel and dest_panel are preserved in routing results, routed detail, and unrouted diagnostics."""
    branches = [
        Branch(branch_id="BR_01", node_from="P101", node_to="E-93D1", level="Level 1", length_m=12.0)
    ]
    cables = [
        Cable(
            cable_tag="W_101",
            source_node="P101",
            dest_node="E-93D1",
            cable_type="4x1.5 mm²",
            od_mm=10.3,
            source_panel="P101",
            dest_panel="P101",
        ),
        Cable(
            cable_tag="W_MISSING",
            source_node="E-93D1",
            dest_node="E-93P2",
            cable_type="4x1.5 mm²",
            od_mm=10.3,
            source_panel="P101",
            dest_panel="P101",
        ),
    ]
    resp = solve_routing_and_sizing(CalculationParameters(), branches, cables)

    # 1. Routed cable preserves panels
    c_routed = resp.cables[0]
    assert c_routed.status == "ROUTED"
    assert c_routed.source_panel == "P101"
    assert c_routed.dest_panel == "P101"

    # Branch cables_detail also preserves panels
    detail = resp.branches[0].cables_detail[0]
    assert detail.source_panel == "P101"
    assert detail.dest_panel == "P101"

    # 2. Unrouted cable preserves panels and includes panel hint in reason
    c_unrouted = resp.cables[1]
    assert c_unrouted.status == "UNROUTED"
    assert c_unrouted.source_panel == "P101"
    assert c_unrouted.dest_panel == "P101"
    assert "[Panel: P101]" in c_unrouted.unrouted_reason


def test_control_cable_laying_method_multi_vs_single_layer():
    """Verify that control/signal cable width matches multi_layer area packing or single_layer flat touching."""
    branches = [
        Branch(branch_id="B1", node_from="P101", node_to="P181", level="L1", length_m=10.0, tray_height_mm=100.0)
    ]
    cables = [
        Cable(
            cable_tag="=GEN-1W001",
            source_node="P101",
            dest_node="P181",
            cable_type="4X2X0.56 MM²",
            od_mm=10.0,
            count=1,
            category="control",
        )
    ]

    # 1. Multi-layer (Default NEC/IEC Area Packing)
    params_multi = CalculationParameters(
        spare_margin_pct=30.0,
        control_fill_pct=40.0,
        default_tray_height_mm=100.0,
        control_cable_laying_method="multi_layer",
    )
    resp_multi = solve_routing_and_sizing(params_multi, branches, cables)
    cd_multi = resp_multi.branches[0].cables_detail[0]
    assert cd_multi.width_contribution_mm == 2.55
    assert cd_multi.formation is None

    # 2. Single Layer Flat (Touching, Width = OD * count * spare_factor)
    params_single = CalculationParameters(
        spare_margin_pct=30.0,
        control_fill_pct=40.0,
        default_tray_height_mm=100.0,
        control_cable_laying_method="single_layer",
    )
    resp_single = solve_routing_and_sizing(params_single, branches, cables)
    cd_single = resp_single.branches[0].cables_detail[0]
    assert cd_single.width_contribution_mm == 13.0
    assert cd_single.formation == "flat_touching"
    # Calculated width on branch should be 10 * 1.30 = 13.0
    assert resp_single.branches[0].calculated_width_mm == 13.0


def test_network_node_fittings_and_reducers():
    from app.models import NodeFittingConfig, NodePortReducer

    params = CalculationParameters()
    branches = [
        Branch(branch_id="BR_A", node_from="NODE_1", node_to="NODE_2", level="Level 1", branch_type="horizontal", length_m=10.0),
        Branch(branch_id="BR_B", node_from="NODE_1", node_to="NODE_3", level="Level 1", branch_type="horizontal", length_m=10.0),
        Branch(branch_id="BR_C", node_from="NODE_1", node_to="NODE_4", level="Level 1", branch_type="horizontal", length_m=10.0),
    ]
    cables = [
        # Heavy cables on BR_A and BR_B (size up to 400mm)
        Cable(cable_tag="C1", source_node="NODE_2", dest_node="NODE_3", cable_type="power", od_mm=50.0, count=4),
        # Small cable on BR_C
        Cable(cable_tag="C2", source_node="NODE_1", dest_node="NODE_4", cable_type="power", od_mm=10.0, count=1),
    ]

    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.nodes is not None
    node1 = next((n for n in resp.nodes if n.node_id == "NODE_1"), None)
    assert node1 is not None
    assert node1.detected_fitting_type == "horizontal_tee"
    assert node1.selected_fitting_type == "horizontal_tee"
    assert node1.width_mm >= 400

    # BR_C is smaller, so it gets a reducer
    assert "BR_C" in node1.reducers
    red_c = node1.reducers["BR_C"]
    assert red_c.from_width_mm == node1.width_mm
    assert red_c.to_width_mm < red_c.from_width_mm
    assert red_c.enabled is True

    # Check BOM has fitting and reducer
    assert resp.bom is not None
    assert resp.bom.total_fittings_count > 0
    assert any(f.fitting_type == "horizontal_tee" for f in resp.bom.fittings)
    assert resp.bom.total_reducers_count > 0
    assert any(r.from_width_mm == red_c.from_width_mm and r.to_width_mm == red_c.to_width_mm for r in resp.bom.reducers)


def test_network_node_fittings_45_deg_multiplier():
    from app.models import NodeFittingConfig

    params = CalculationParameters()
    branches = [
        Branch(branch_id="BR_1", node_from="N_A", node_to="N_B", level="Level 1", branch_type="horizontal", length_m=5.0),
        Branch(branch_id="BR_2", node_from="N_A", node_to="N_C", level="Level 1", branch_type="horizontal", length_m=5.0),
    ]
    cables = [
        Cable(cable_tag="C1", source_node="N_B", dest_node="N_C", cable_type="power", od_mm=20.0, count=2)
    ]
    node_fittings = {
        "N_A": NodeFittingConfig(
            node_id="N_A",
            fitting_type="horizontal_elbow_45",
            user_override=True,
        )
    }

    resp = solve_routing_and_sizing(params, branches, cables, node_fittings=node_fittings)
    node_a = next((n for n in resp.nodes if n.node_id == "N_A"), None)
    assert node_a is not None
    assert node_a.selected_fitting_type == "horizontal_elbow_45"
    assert node_a.quantity_multiplier == 2

    assert resp.bom is not None
    elbow_item = next((f for f in resp.bom.fittings if f.fitting_type == "horizontal_elbow_45"), None)
    assert elbow_item is not None
    assert elbow_item.quantity == 2



