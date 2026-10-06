import pytest
from app.models import CalculationParameters, Branch, Cable, BranchStatus
from app.routing_engine import (
    solve_routing_and_sizing,
    resolve_cable_weight_kg_m,
    calculate_tray_dead_load_kg_m,
    calculate_optimal_support_span,
    calculate_branch_supports_count,
    generate_bill_of_materials,
)


def test_resolve_cable_weight_kg_m():
    # 1. Explicit weight_kg_m
    c1 = Cable(cable_tag="C1", source_node="A", dest_node="B", cable_type="4x50", weight_kg_m=3.2)
    assert resolve_cable_weight_kg_m(c1, 32.0) == 3.2

    # 2. Explicit weight_kg_km
    c2 = Cable(cable_tag="C2", source_node="A", dest_node="B", cable_type="Unknown", weight_kg_km=1800.0)
    assert resolve_cable_weight_kg_m(c2, 20.0) == 1.8

    # 3. Technical catalog match (4x50 -> 2305 kg/km = 2.305 kg/m)
    c3 = Cable(cable_tag="C3", source_node="A", dest_node="B", cable_type="4x50 mm²")
    assert resolve_cable_weight_kg_m(c3, 32.1) == 2.305

    # 4. Empirical density formula: OD^2 * factor
    c4_pwr = Cable(cable_tag="C4", source_node="A", dest_node="B", cable_type="custom_power", category="power")
    assert pytest.approx(resolve_cable_weight_kg_m(c4_pwr, 20.0), 0.01) == round(20.0**2 * 0.0022, 3)

    c4_ctrl = Cable(cable_tag="C5", source_node="A", dest_node="B", cable_type="custom_ctrl", category="control")
    assert pytest.approx(resolve_cable_weight_kg_m(c4_ctrl, 12.0), 0.01) == round(12.0**2 * 0.0018, 3)


def test_calculate_tray_dead_load_kg_m():
    # 300x60mm tray, 1.5mm steel sheet
    # Perimeter = 300 + 120 + 30 = 450mm = 0.45m
    # Dead load = 0.45 * 0.0015 * 7850 * 0.85 = 4.50 kg/m
    dead_load = calculate_tray_dead_load_kg_m(300, 60, 1.5, has_cover=False)
    assert dead_load == 4.5

    # With cover: adds (300 + 30) * 0.0012 * 7850 = 3.11 kg/m
    covered_load = calculate_tray_dead_load_kg_m(300, 60, 1.5, has_cover=True)
    assert covered_load == 7.61


def test_calculate_optimal_support_span():
    # 60mm flange tray
    # <= 40 kg/m -> 3.0m
    s3, swl3, util3 = calculate_optimal_support_span(35.0, 60)
    assert s3 == 3.0
    assert swl3 == 40.0
    assert util3 == 87.5

    # 60 kg/m <= 75 kg/m -> 2.5m
    s25, _, _ = calculate_optimal_support_span(60.0, 60)
    assert s25 == 2.5

    # 100 kg/m <= 125 kg/m -> 2.0m
    s2, _, _ = calculate_optimal_support_span(100.0, 60)
    assert s2 == 2.0

    # 180 kg/m <= 220 kg/m -> 1.5m
    s15, _, _ = calculate_optimal_support_span(180.0, 60)
    assert s15 == 1.5

    # 100mm flange tray higher capacity: 50 kg/m fits 3.0m span (SWL 65 kg/m)
    s100, swl100, _ = calculate_optimal_support_span(50.0, 100)
    assert s100 == 3.0
    assert swl100 == 65.0


def test_calculate_branch_supports_count():
    # Linear span: ceil(12m / 2.5m) = 5
    assert calculate_branch_supports_count(12.0, 2.5, near_fitting_count=0) == 5
    # With junction allowance (+1)
    assert calculate_branch_supports_count(12.0, 2.5, near_fitting_count=1) == 6


def test_solve_routing_and_sizing_structural_integration():
    params = CalculationParameters(
        spare_margin_pct=10.0,
        structural_safety_margin_pct=15.0,
        tray_sheet_thickness_mm=1.5,
        default_tray_height_mm=60.0,
        default_mounting_type="ceiling_trapeze",
    )
    branches = [
        Branch(branch_id="BR_01", node_from="N1", node_to="N2", level="Level 1", length_m=12.0, tray_height_mm=60.0),
        Branch(branch_id="BR_02", node_from="N2", node_to="N3", level="Level 1", length_m=6.0, tray_height_mm=60.0, mounting_type="wall_cantilever"),
    ]
    cables = [
        # 4x50 catalog weight = 2.305 kg/m * 2 runs = 4.61 kg/m
        Cable(cable_tag="C_PWR_1", source_node="N1", dest_node="N3", cable_type="4x50 mm²", count=2),
    ]

    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.summary.total_cables_routed == 1

    b1 = resp.branches[0]
    assert b1.branch_id == "BR_01"
    assert b1.cable_load_kg_m == 4.61
    assert b1.tray_dead_load_kg_m > 0
    assert b1.total_load_kg_m > b1.cable_load_kg_m  # includes safety margin + dead load
    assert b1.recommended_support_span_m in [1.5, 2.0, 2.5, 3.0]
    assert b1.supports_count >= 4
    assert b1.support_mounting_type == "ceiling_trapeze"

    b2 = resp.branches[1]
    assert b2.branch_id == "BR_02"
    assert b2.support_mounting_type == "wall_cantilever"

    # Cables detail check
    assert len(b1.cables_detail) == 1
    cd = b1.cables_detail[0]
    assert cd.weight_kg_m == 2.305
    assert cd.total_weight_kg == round(2.305 * 12.0 * 2, 2)


def test_generate_bill_of_materials_supports_and_weights():
    params = CalculationParameters(default_mounting_type="ceiling_trapeze")
    branches = [
        Branch(branch_id="BR_01", node_from="N1", node_to="N2", level="Level 1", length_m=10.0, tray_height_mm=60.0),
        Branch(branch_id="BR_02", node_from="N2", node_to="N3", level="Level 1", length_m=8.0, tray_height_mm=60.0, mounting_type="wall_cantilever"),
    ]
    cables = [
        Cable(cable_tag="C1", source_node="N1", dest_node="N3", cable_type="4x50 mm²", count=1),
    ]

    resp = solve_routing_and_sizing(params, branches, cables)
    bom = resp.bom
    assert bom is not None

    # Check structural weights
    assert bom.total_cable_weight_kg > 0
    assert bom.total_tray_weight_kg > 0
    assert bom.total_installation_weight_kg == round(bom.total_cable_weight_kg + bom.total_tray_weight_kg, 2)
    assert bom.total_supports_count > 0

    # Check accessories contain sized supports
    acc_names = [a.item_name for a in bom.accessories]
    has_trapeze = any("Trapeze Ceiling Support Hanger" in name for name in acc_names)
    has_cantilever = any("Cantilever Wall Support Bracket" in name for name in acc_names)
    assert has_trapeze, f"Expected Trapeze Ceiling Support Hanger in accessories: {acc_names}"
    assert has_cantilever, f"Expected Cantilever Wall Support Bracket in accessories: {acc_names}"
