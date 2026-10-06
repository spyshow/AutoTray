from datetime import datetime
from sqlalchemy.orm import Session

from .cable_catalog import LOW_VOLTAGE_CABLE_CATALOG
from .db_models import (
    ProjectModel,
    ProjectParametersModel,
    BranchModel,
    CableModel,
    CableCatalogModel,
    CalculationResultModel,
)
from .models import CalculationParameters, Branch, Cable
from .routing_engine import solve_routing_and_sizing


def seed_cable_catalog(db: Session) -> int:
    """Populates cable_catalog table from LOW_VOLTAGE_CABLE_CATALOG if empty."""
    count = db.query(CableCatalogModel).count()
    if count > 0:
        return 0

    inserted = 0
    for entry in LOW_VOLTAGE_CABLE_CATALOG:
        catalog_item = CableCatalogModel(
            code=entry["code"],
            category=entry["category"],
            category_label=entry.get("category_label", entry["category"]),
            voltage=entry.get("voltage", "0.6/1 kV"),
            cores=int(entry.get("cores", 1)),
            size_mm2=float(entry.get("size_mm2", 0.0)),
            conductor_type=entry.get("conductor_type", "Stranded"),
            insulation_sheath=entry.get("insulation_sheath", "Cu/XLPE/PVC"),
            standard=entry.get("standard", "IEC 60502"),
            designation=entry.get("designation", entry["code"]),
            od_mm=float(entry.get("od_mm", 0.0)),
            weight_kg_km=float(entry["weight_kg_km"]) if entry.get("weight_kg_km") is not None else None,
            current_air_a=float(entry["current_air_a"]) if entry.get("current_air_a") is not None else None,
        )
        db.add(catalog_item)
        inserted += 1

    db.commit()
    return inserted


def seed_demo_project_if_empty(db: Session) -> bool:
    """Creates default demo project if projects table is empty."""
    if db.query(ProjectModel).count() > 0:
        return False

    demo_project = ProjectModel(
        id="PRJ_DEMO_01",
        name="Industrial Refinery - Multi-Level Riser",
        code="DEMO-REF-01",
        description="3-tier substation transition with 18 branches and 42 mixed power/control/data cables",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(demo_project)
    db.flush()

    params_model = ProjectParametersModel(
        project_id=demo_project.id,
        spare_margin_pct=20.0,
        control_fill_pct=40.0,
        default_tray_height_mm=60.0,
        add_metallic_divider=False,
        divider_width_mm=15.0,
        default_power_od_mm=25.0,
        default_control_od_mm=14.0,
        default_signal_od_mm=10.0,
        default_data_od_mm=8.5,
        default_global_od_mm=15.0,
        custom_od_by_type={},
        single_core_power_formation="trefoil",
        control_cable_laying_method="multi_layer",
        structural_safety_margin_pct=15.0,
        tray_sheet_thickness_mm=1.5,
        default_mounting_type="ceiling_trapeze",
    )
    db.add(params_model)

    sample_branches = [
        ("BR_L1_01", "TRANSF_01", "MCC_L1", "Level 1", "horizontal", 12.0, 100.0, "ceiling_trapeze"),
        ("BR_L1_02", "MCC_L1", "DCS_RACK_L1", "Level 1", "horizontal", 8.5, 60.0, "ceiling_trapeze"),
        ("BR_L1_03", "MCC_L1", "JUNC_L1_EAST", "Level 1", "horizontal", 14.5, 60.0, "ceiling_trapeze"),
        ("BR_L1_04", "DCS_RACK_L1", "JUNC_L1_EAST", "Level 1", "horizontal", 10.0, 60.0, "ceiling_trapeze"),
        ("BR_L1_05", "JUNC_L1_EAST", "COOLING_PUMP_P1", "Level 1", "horizontal", 7.5, 60.0, "ceiling_trapeze"),
        ("BR_L1_06", "JUNC_L1_EAST", "TEMP_TRANSMITTER_TT101", "Level 1", "horizontal", 6.0, 60.0, "ceiling_trapeze"),
        ("BR_L1_07", "MCC_L1", "RISER_EAST_L1", "Level 1", "horizontal", 18.0, 100.0, "ceiling_trapeze"),
        ("BR_L1_08", "MCC_L1", "COMPRESSOR_CP1", "Level 1", "horizontal", 11.0, 60.0, "ceiling_trapeze"),
        ("RISER_E_L1_L2", "RISER_EAST_L1", "RISER_EAST_L2", "Transition", "vertical", 5.0, 100.0, "wall_cantilever"),
        ("BR_L2_01", "RISER_EAST_L2", "FEEDER_PANEL_L2", "Level 2", "horizontal", 15.0, 100.0, "ceiling_trapeze"),
        ("BR_L2_02", "FEEDER_PANEL_L2", "MCC_L2", "Level 2", "horizontal", 6.0, 100.0, "ceiling_trapeze"),
        ("BR_L2_03", "FEEDER_PANEL_L2", "PLC_PANEL_L2", "Level 2", "horizontal", 9.0, 60.0, "ceiling_trapeze"),
        ("BR_L2_04", "MCC_L2", "MIXER_MOTOR_M2", "Level 2", "horizontal", 12.5, 60.0, "ceiling_trapeze"),
        ("BR_L2_05", "PLC_PANEL_L2", "VALVE_CLUSTER_V1", "Level 2", "horizontal", 8.0, 60.0, "ceiling_trapeze"),
        ("BR_L2_06", "PLC_PANEL_L2", "JUNC_L2_WEST", "Level 2", "horizontal", 11.5, 60.0, "ceiling_trapeze"),
        ("BR_L2_07", "JUNC_L2_WEST", "PRESSURE_SENSOR_PT202", "Level 2", "horizontal", 5.0, 60.0, "ceiling_trapeze"),
        ("BR_L2_08", "RISER_EAST_L2", "RISER_EAST_L2_L3", "Level 2", "horizontal", 4.0, 100.0, "ceiling_trapeze"),
        ("RISER_E_L2_L3", "RISER_EAST_L2_L3", "RISER_EAST_L3", "Transition", "vertical", 5.5, 100.0, "wall_cantilever"),
        ("BR_L3_01", "RISER_EAST_L3", "REMOTE_IO_L3", "Level 3", "horizontal", 14.0, 60.0, "ceiling_trapeze"),
        ("BR_L3_02", "RISER_EAST_L3", "FOREHEARTH_FAN_M1", "Level 3", "horizontal", 22.0, 100.0, "ceiling_trapeze"),
        ("BR_L3_03", "RISER_EAST_L3", "EXHAUST_BLOWER_B1", "Level 3", "horizontal", 18.5, 100.0, "ceiling_trapeze"),
    ]

    pydantic_branches = []
    for bid, nfrom, nto, lvl, btype, length, th, mtype in sample_branches:
        branch_model = BranchModel(
            project_id=demo_project.id,
            branch_id=bid,
            node_from=nfrom,
            node_to=nto,
            level=lvl,
            branch_type=btype,
            length_m=length,
            tray_height_mm=th,
            mounting_type=mtype,
        )
        db.add(branch_model)
        pydantic_branches.append(
            Branch(
                branch_id=bid,
                node_from=nfrom,
                node_to=nto,
                level=lvl,
                branch_type=btype,
                length_m=length,
                tray_height_mm=th,
                mounting_type=mtype,
            )
        )

    sample_cables = [
        ("C_PWR_01", "MCC_L1", "FOREHEARTH_FAN_M1", "Power", 28.4, 1, "power", "trefoil", "MCC_L1", "FOREHEARTH_FAN_M1", 1250.0),
        ("C_PWR_02", "MCC_L1", "COOLING_PUMP_P1", "Power", 24.2, 1, "power", "trefoil", "MCC_L1", "COOLING_PUMP_P1", 980.0),
        ("C_PWR_03", "MCC_L1", "FEEDER_PANEL_L2", "Power", 35.0, 1, "power", "trefoil", "MCC_L1", "FEEDER_PANEL_L2", 1850.0),
        ("C_PWR_04", "TRANSF_01", "MCC_L1", "Power", 42.5, 3, "power", "trefoil", "TRANSF_01", "MCC_L1", 2800.0),
        ("C_PWR_05", "MCC_L2", "MIXER_MOTOR_M2", "Power", 22.8, 1, "power", "trefoil", "MCC_L2", "MIXER_MOTOR_M2", 850.0),
        ("C_PWR_06", "MCC_L2", "EXHAUST_BLOWER_B1", "Power", 31.0, 1, "power", "trefoil", "MCC_L2", "EXHAUST_BLOWER_B1", 1520.0),
        ("C_PWR_07", "MCC_L1", "COMPRESSOR_CP1", "Power", 38.5, 1, "power", "trefoil", "MCC_L1", "COMPRESSOR_CP1", 2200.0),
        ("C_CTRL_01", "DCS_RACK_L1", "FOREHEARTH_FAN_M1", "Control", 12.5, 2, "control", None, "DCS_RACK_L1", "FOREHEARTH_FAN_M1", 240.0),
        ("C_CTRL_02", "DCS_RACK_L1", "COOLING_PUMP_P1", "Control", 14.0, 1, "control", None, "DCS_RACK_L1", "COOLING_PUMP_P1", 290.0),
        ("C_CTRL_03", "PLC_PANEL_L2", "MIXER_MOTOR_M2", "Control", 12.0, 1, "control", None, "PLC_PANEL_L2", "MIXER_MOTOR_M2", 230.0),
        ("C_CTRL_04", "PLC_PANEL_L2", "VALVE_CLUSTER_V1", "Control", 16.5, 2, "control", None, "PLC_PANEL_L2", "VALVE_CLUSTER_V1", 410.0),
        ("C_SIG_01", "JUNC_L1_EAST", "TEMP_TRANSMITTER_TT101", "Signal", 8.8, 4, "signal", None, "JUNC_L1_EAST", "TEMP_TRANSMITTER_TT101", 120.0),
        ("C_SIG_02", "JUNC_L2_WEST", "PRESSURE_SENSOR_PT202", "Signal", 9.2, 3, "signal", None, "JUNC_L2_WEST", "PRESSURE_SENSOR_PT202", 135.0),
        ("C_DATA_01", "DCS_RACK_L1", "PLC_PANEL_L2", "Data", 11.2, 2, "data", None, "DCS_RACK_L1", "PLC_PANEL_L2", 160.0),
        ("C_DATA_02", "PLC_PANEL_L2", "REMOTE_IO_L3", "Data", 10.5, 1, "data", None, "PLC_PANEL_L2", "REMOTE_IO_L3", 145.0),
        ("C_BUS_01", "DCS_RACK_L1", "MCC_L1", "Bus", 9.5, 1, "bus", None, "DCS_RACK_L1", "MCC_L1", 110.0),
        ("C_BUS_02", "PLC_PANEL_L2", "MCC_L2", "Bus", 9.5, 1, "bus", None, "PLC_PANEL_L2", "MCC_L2", 110.0),
    ]

    pydantic_cables = []
    for tag, src, dst, ctype, od, count, cat, form, spanel, dpanel, wkm in sample_cables:
        cable_model = CableModel(
            project_id=demo_project.id,
            cable_tag=tag,
            source_node=src,
            dest_node=dst,
            cable_type=ctype,
            od_mm=od,
            count=count,
            category=cat,
            formation=form,
            source_panel=spanel,
            dest_panel=dpanel,
            weight_kg_km=wkm,
            weight_kg_m=round(wkm / 1000.0, 4) if wkm else None,
        )
        db.add(cable_model)
        pydantic_cables.append(
            Cable(
                cable_tag=tag,
                source_node=src,
                dest_node=dst,
                cable_type=ctype,
                od_mm=od,
                count=count,
                category=cat,
                formation=form,
                source_panel=spanel,
                dest_panel=dpanel,
                weight_kg_km=wkm,
                weight_kg_m=round(wkm / 1000.0, 4) if wkm else None,
            )
        )

    # Calculate initial sizing and persist result
    try:
        calc_response = solve_routing_and_sizing(
            parameters=CalculationParameters(),
            branches=pydantic_branches,
            cables=pydantic_cables,
        )
        calc_res_model = CalculationResultModel(
            project_id=demo_project.id,
            calculated_at=datetime.utcnow(),
            summary=calc_response.summary.model_dump(),
            branches=[b.model_dump() for b in calc_response.branches],
            cables=[c.model_dump() for c in calc_response.cables],
            diagnostics=calc_response.diagnostics.model_dump(),
            bom=calc_response.bom.model_dump() if calc_response.bom else None,
            nodes=[n.model_dump() for n in calc_response.nodes],
        )
        db.add(calc_res_model)
    except Exception as e:
        print(f"Warning: Demo project initial calculation failed: {e}")

    db.commit()
    return True
