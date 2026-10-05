"""Standalone test runner for backend logic verification."""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import CalculationParameters, Branch, Cable, BranchStatus
from app.routing_engine import solve_routing_and_sizing, STANDARD_COMMERCIAL_WIDTHS
from app.excel_exporter import generate_excel_report
from app.sample_generator import generate_sample_excel_workbook


def run_all_checks():
    print("[1/11] Testing Standard Commercial Widths (50 to 700 mm)...")
    assert STANDARD_COMMERCIAL_WIDTHS == [50, 75, 100, 150, 200, 300, 400, 450, 500, 600, 700]
    print("       PASSED")

    print("[2/11] Testing Power Cable Sizing (Single Layer 2x OD spacing)...")
    params = CalculationParameters(spare_margin_pct=20.0, control_fill_pct=40.0, default_tray_height_mm=60.0)
    branches = [Branch(branch_id="BR_01", node_from="A", node_to="B", level="Level 1", length_m=10.0)]
    cables = [Cable(cable_tag="C_PWR_1", source_node="A", dest_node="B", cable_type="power", od_mm=30.0, count=1)]
    resp = solve_routing_and_sizing(params, branches, cables)
    assert resp.summary.total_cables_routed == 1
    assert resp.branches[0].power_width_mm == 60.0
    assert resp.branches[0].calculated_width_mm == 72.0
    assert resp.branches[0].recommended_commercial_width_mm == 75
    assert resp.branches[0].status == "OK"
    print("       PASSED")

    print("[3/11] Testing Control Cable Multilayer Packing by Area...")
    params_ctrl = CalculationParameters(spare_margin_pct=0.0, control_fill_pct=40.0, default_tray_height_mm=60.0)
    branches_ctrl = [Branch(branch_id="BR_CTRL", node_from="X", node_to="Y", level="Level 1", length_m=5.0)]
    cables_ctrl = [Cable(cable_tag="C_CTRL_1", source_node="X", dest_node="Y", cable_type="control", od_mm=10.0, count=10)]
    resp_ctrl = solve_routing_and_sizing(params_ctrl, branches_ctrl, cables_ctrl)
    assert resp_ctrl.branches[0].control_cables_count == 10
    assert abs(resp_ctrl.branches[0].control_width_mm - 32.72) < 0.1
    print("       PASSED")

    print("[4/11] Testing Multi-Level Riser Shortest Path Routing...")
    branches_multi = [
        Branch(branch_id="TRAY_L1", node_from="L1_START", node_to="L1_RISER_BASE", level="Level 1", length_m=10.0),
        Branch(branch_id="RISER_V1", node_from="L1_RISER_BASE", node_to="L2_RISER_TOP", level="Transition", branch_type="vertical", length_m=5.0),
        Branch(branch_id="TRAY_L2", node_from="L2_RISER_TOP", node_to="L2_LOAD", level="Level 2", length_m=8.0),
    ]
    cables_multi = [Cable(cable_tag="FEEDER_01", source_node="L1_START", dest_node="L2_LOAD", cable_type="power", od_mm=20.0, count=1)]
    resp_multi = solve_routing_and_sizing(params, branches_multi, cables_multi)
    assert resp_multi.summary.total_cables_routed == 1
    assert resp_multi.cables[0].total_length_m == 23.0
    assert resp_multi.cables[0].path_branches == ["TRAY_L1", "RISER_V1", "TRAY_L2"]
    print("       PASSED")

    print("[5/11] Testing Whitespace Trimming & Node Resiliency...")
    branches_ws = [Branch(branch_id="BR_WS", node_from="  PANEL_A  ", node_to="  JUNC_B\n", length_m=10.0)]
    cables_ws = [Cable(cable_tag="C_WS", source_node="PANEL_A", dest_node="JUNC_B", cable_type="power", od_mm=15.0)]
    resp_ws = solve_routing_and_sizing(params, branches_ws, cables_ws)
    assert resp_ws.summary.total_cables_routed == 1
    print("       PASSED")

    print("[6/11] Testing Zero Tray Height Safety Protection...")
    branches_zero_h = [Branch(branch_id="BR_ZERO", node_from="A", node_to="B", length_m=5.0, tray_height_mm=0.0)]
    cables_zero_h = [Cable(cable_tag="C_CTRL", source_node="A", dest_node="B", cable_type="control", od_mm=10.0, count=2)]
    resp_zero_h = solve_routing_and_sizing(params, branches_zero_h, cables_zero_h)
    assert resp_zero_h.branches[0].calculated_width_mm > 0
    print("       PASSED")

    print("[7/11] Testing Parallel Branch Shortest Path Selection...")
    branches_par = [
        Branch(branch_id="BR_LONG", node_from="A", node_to="B", length_m=25.0),
        Branch(branch_id="BR_SHORT", node_from="A", node_to="B", length_m=6.0),
    ]
    cables_par = [Cable(cable_tag="C1", source_node="A", dest_node="B", cable_type="power", od_mm=10.0)]
    resp_par = solve_routing_and_sizing(params, branches_par, cables_par)
    assert resp_par.cables[0].total_length_m == 6.0
    assert resp_par.cables[0].path_branches == ["BR_SHORT"]
    print("       PASSED")

    print("[8/11] Testing Pydantic AliasChoices Schema Support...")
    b_alias = Branch.model_validate({"id": "BR_A", "from": "N1", "to": "N2", "type": "horizontal", "length": 14.0, "height": 75.0})
    assert b_alias.branch_id == "BR_A"
    assert b_alias.length_m == 14.0
    assert b_alias.tray_height_mm == 75.0
    c_alias = Cable.model_validate({"tag": "C_A", "from": "N1", "to": "N2", "type": "400V Feeder", "od": 22.0, "qty": 2})
    assert c_alias.cable_type == "400V Feeder"
    assert c_alias.count == 2
    print("       PASSED")

    print("[9/11] Testing Cable OD Fallback from Default Parameters...")
    params_def_od = CalculationParameters(default_power_od_mm=30.0)
    c_no_od = [Cable(cable_tag="C_NO_OD", source_node="A", dest_node="B", cable_type="power", od_mm=None, count=1)]
    resp_def = solve_routing_and_sizing(params_def_od, branches, c_no_od)
    assert resp_def.cables[0].od_mm == 30.0
    assert resp_def.branches[0].power_width_mm == 60.0
    print("       PASSED")

    print("[10/11] Testing Excel Exporter Generation...")
    stream = generate_excel_report(resp_multi)
    assert len(stream.getvalue()) > 1000
    print("        PASSED")

    print("[11/11] Testing Sample Excel Template Generation...")
    template_stream = generate_sample_excel_workbook()
    assert len(template_stream.getvalue()) > 1000
    print("        PASSED")

    print("[12/12] Testing Bill of Materials (BOM) Calculation...")
    assert resp_multi.bom is not None
    assert resp_multi.bom.total_tray_length_m == 23.0
    assert resp_multi.bom.total_sections_3m >= 8
    assert len(resp_multi.bom.accessories) >= 3
    print("        PASSED")

    print("\nALL 12 BACKEND VERIFICATION CHECKS COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    run_all_checks()
