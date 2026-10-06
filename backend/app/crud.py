import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .db_models import (
    ProjectModel,
    ProjectParametersModel,
    BranchModel,
    CableModel,
    NodeFittingModel,
    CableCatalogModel,
    CalculationResultModel,
)
from .models import (
    ProjectCreate,
    ProjectUpdate,
    ProjectSummary,
    ProjectDetail,
    CalculationParameters,
    Branch,
    Cable,
    NodeFittingConfig,
    CalculationResponse,
    CableCatalogItem,
)


def db_project_to_detail(p: ProjectModel) -> ProjectDetail:
    """Converts a ProjectModel SQLAlchemy instance to a ProjectDetail Pydantic model."""
    if p.parameters:
        params = CalculationParameters(
            spare_margin_pct=p.parameters.spare_margin_pct,
            control_fill_pct=p.parameters.control_fill_pct,
            default_tray_height_mm=p.parameters.default_tray_height_mm,
            add_metallic_divider=p.parameters.add_metallic_divider,
            divider_width_mm=p.parameters.divider_width_mm,
            default_power_od_mm=p.parameters.default_power_od_mm,
            default_control_od_mm=p.parameters.default_control_od_mm,
            default_signal_od_mm=p.parameters.default_signal_od_mm,
            default_data_od_mm=p.parameters.default_data_od_mm,
            default_global_od_mm=p.parameters.default_global_od_mm,
            custom_od_by_type=p.parameters.custom_od_by_type or {},
            single_core_power_formation=p.parameters.single_core_power_formation,
            control_cable_laying_method=p.parameters.control_cable_laying_method,
            structural_safety_margin_pct=p.parameters.structural_safety_margin_pct,
            tray_sheet_thickness_mm=p.parameters.tray_sheet_thickness_mm,
            default_mounting_type=p.parameters.default_mounting_type,
        )
    else:
        params = CalculationParameters()

    branches = [
        Branch(
            branch_id=b.branch_id,
            node_from=b.node_from,
            node_to=b.node_to,
            level=b.level,
            branch_type=b.branch_type,
            length_m=b.length_m,
            tray_height_mm=b.tray_height_mm,
            mounting_type=b.mounting_type,
            weight_override_kg_m=b.weight_override_kg_m,
        )
        for b in p.branches
    ]

    cables = [
        Cable(
            cable_tag=c.cable_tag,
            source_node=c.source_node,
            dest_node=c.dest_node,
            cable_type=c.cable_type,
            od_mm=c.od_mm,
            count=c.count,
            category=c.category,
            formation=c.formation,
            source_panel=c.source_panel,
            dest_panel=c.dest_panel,
            weight_kg_km=c.weight_kg_km,
            weight_kg_m=c.weight_kg_m,
        )
        for c in p.cables
    ]

    fittings: Dict[str, NodeFittingConfig] = {}
    for f in p.node_fittings:
        fittings[f.node_id] = NodeFittingConfig(
            node_id=f.node_id,
            fitting_type=f.fitting_type,
            user_override=f.user_override,
            notes=f.notes,
            include_cover=f.include_cover,
            quantity_multiplier=f.quantity_multiplier,
            reducers=f.reducers or {},
        )

    calc_resp: Optional[CalculationResponse] = None
    if p.calculation_result:
        try:
            calc_resp = CalculationResponse(
                summary=p.calculation_result.summary,
                branches=p.calculation_result.branches,
                cables=p.calculation_result.cables,
                diagnostics=p.calculation_result.diagnostics,
                bom=p.calculation_result.bom,
                nodes=p.calculation_result.nodes or [],
            )
        except Exception:
            calc_resp = None

    return ProjectDetail(
        id=p.id,
        name=p.name,
        code=p.code,
        description=p.description or "",
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
        parameters=params,
        branches=branches,
        cables=cables,
        node_fittings=fittings,
        latest_calculation=calc_resp,
    )


def get_projects(db: Session) -> List[ProjectSummary]:
    projects = db.query(ProjectModel).order_by(ProjectModel.updated_at.desc()).all()
    summaries = []
    for p in projects:
        summaries.append(
            ProjectSummary(
                id=p.id,
                name=p.name,
                code=p.code,
                description=p.description or "",
                created_at=p.created_at.isoformat(),
                updated_at=p.updated_at.isoformat(),
                branches_count=len(p.branches),
                cables_count=len(p.cables),
            )
        )
    return summaries


def get_project(db: Session, project_id: str) -> Optional[ProjectDetail]:
    p = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not p:
        return None
    return db_project_to_detail(p)


def create_project(db: Session, project_in: ProjectCreate) -> ProjectDetail:
    project_id = project_in.id or f"PRJ_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:5]}"
    p = ProjectModel(
        id=project_id,
        name=project_in.name,
        code=project_in.code,
        description=project_in.description or "",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(p)
    db.flush()

    # Parameters
    params = project_in.parameters or CalculationParameters()
    pm = ProjectParametersModel(
        project_id=p.id,
        spare_margin_pct=params.spare_margin_pct,
        control_fill_pct=params.control_fill_pct,
        default_tray_height_mm=params.default_tray_height_mm,
        add_metallic_divider=params.add_metallic_divider,
        divider_width_mm=params.divider_width_mm,
        default_power_od_mm=params.default_power_od_mm,
        default_control_od_mm=params.default_control_od_mm,
        default_signal_od_mm=params.default_signal_od_mm,
        default_data_od_mm=params.default_data_od_mm,
        default_global_od_mm=params.default_global_od_mm,
        custom_od_by_type=params.custom_od_by_type or {},
        single_core_power_formation=params.single_core_power_formation or "trefoil",
        control_cable_laying_method=params.control_cable_laying_method or "multi_layer",
        structural_safety_margin_pct=params.structural_safety_margin_pct or 15.0,
        tray_sheet_thickness_mm=params.tray_sheet_thickness_mm or 1.5,
        default_mounting_type=params.default_mounting_type or "ceiling_trapeze",
    )
    db.add(pm)

    # Branches
    if project_in.branches:
        for b in project_in.branches:
            bm = BranchModel(
                project_id=p.id,
                branch_id=b.branch_id,
                node_from=b.node_from,
                node_to=b.node_to,
                level=b.level,
                branch_type=b.branch_type,
                length_m=b.length_m,
                tray_height_mm=b.tray_height_mm,
                mounting_type=b.mounting_type,
                weight_override_kg_m=b.weight_override_kg_m,
            )
            db.add(bm)

    # Cables
    if project_in.cables:
        for c in project_in.cables:
            cm = CableModel(
                project_id=p.id,
                cable_tag=c.cable_tag,
                source_node=c.source_node,
                dest_node=c.dest_node,
                cable_type=c.cable_type,
                od_mm=c.od_mm,
                count=c.count,
                category=c.category,
                formation=c.formation,
                source_panel=c.source_panel,
                dest_panel=c.dest_panel,
                weight_kg_km=c.weight_kg_km,
                weight_kg_m=c.weight_kg_m,
            )
            db.add(cm)

    # Fittings
    if project_in.node_fittings:
        for nid, f in project_in.node_fittings.items():
            fm = NodeFittingModel(
                project_id=p.id,
                node_id=nid,
                fitting_type=f.fitting_type,
                user_override=f.user_override,
                notes=f.notes,
                include_cover=f.include_cover,
                quantity_multiplier=f.quantity_multiplier,
                reducers={k: v.model_dump() for k, v in f.reducers.items()} if f.reducers else {},
            )
            db.add(fm)

    db.commit()
    db.refresh(p)
    return db_project_to_detail(p)


def update_project(db: Session, project_id: str, project_in: ProjectUpdate) -> Optional[ProjectDetail]:
    p = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not p:
        return None

    if project_in.name is not None:
        p.name = project_in.name
    if project_in.code is not None:
        p.code = project_in.code
    if project_in.description is not None:
        p.description = project_in.description
    p.updated_at = datetime.utcnow()

    # Update parameters if provided
    if project_in.parameters is not None:
        params = project_in.parameters
        if not p.parameters:
            p.parameters = ProjectParametersModel(project_id=p.id)
            db.add(p.parameters)
        p.parameters.spare_margin_pct = params.spare_margin_pct
        p.parameters.control_fill_pct = params.control_fill_pct
        p.parameters.default_tray_height_mm = params.default_tray_height_mm
        p.parameters.add_metallic_divider = params.add_metallic_divider
        p.parameters.divider_width_mm = params.divider_width_mm
        p.parameters.default_power_od_mm = params.default_power_od_mm
        p.parameters.default_control_od_mm = params.default_control_od_mm
        p.parameters.default_signal_od_mm = params.default_signal_od_mm
        p.parameters.default_data_od_mm = params.default_data_od_mm
        p.parameters.default_global_od_mm = params.default_global_od_mm
        p.parameters.custom_od_by_type = params.custom_od_by_type or {}
        p.parameters.single_core_power_formation = params.single_core_power_formation or "trefoil"
        p.parameters.control_cable_laying_method = params.control_cable_laying_method or "multi_layer"
        p.parameters.structural_safety_margin_pct = params.structural_safety_margin_pct or 15.0
        p.parameters.tray_sheet_thickness_mm = params.tray_sheet_thickness_mm or 1.5
        p.parameters.default_mounting_type = params.default_mounting_type or "ceiling_trapeze"

    # Replace branches if provided
    if project_in.branches is not None:
        db.query(BranchModel).filter(BranchModel.project_id == p.id).delete()
        for b in project_in.branches:
            bm = BranchModel(
                project_id=p.id,
                branch_id=b.branch_id,
                node_from=b.node_from,
                node_to=b.node_to,
                level=b.level,
                branch_type=b.branch_type,
                length_m=b.length_m,
                tray_height_mm=b.tray_height_mm,
                mounting_type=b.mounting_type,
                weight_override_kg_m=b.weight_override_kg_m,
            )
            db.add(bm)

    # Replace cables if provided
    if project_in.cables is not None:
        db.query(CableModel).filter(CableModel.project_id == p.id).delete()
        for c in project_in.cables:
            cm = CableModel(
                project_id=p.id,
                cable_tag=c.cable_tag,
                source_node=c.source_node,
                dest_node=c.dest_node,
                cable_type=c.cable_type,
                od_mm=c.od_mm,
                count=c.count,
                category=c.category,
                formation=c.formation,
                source_panel=c.source_panel,
                dest_panel=c.dest_panel,
                weight_kg_km=c.weight_kg_km,
                weight_kg_m=c.weight_kg_m,
            )
            db.add(cm)

    # Replace fittings if provided
    if project_in.node_fittings is not None:
        db.query(NodeFittingModel).filter(NodeFittingModel.project_id == p.id).delete()
        for nid, f in project_in.node_fittings.items():
            fm = NodeFittingModel(
                project_id=p.id,
                node_id=nid,
                fitting_type=f.fitting_type,
                user_override=f.user_override,
                notes=f.notes,
                include_cover=f.include_cover,
                quantity_multiplier=f.quantity_multiplier,
                reducers={k: v.model_dump() for k, v in f.reducers.items()} if f.reducers else {},
            )
            db.add(fm)

    db.commit()
    db.refresh(p)
    return db_project_to_detail(p)


def delete_project(db: Session, project_id: str) -> bool:
    p = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not p:
        return False
    db.delete(p)
    db.commit()
    return True


def save_project_calculation(db: Session, project_id: str, result: CalculationResponse) -> CalculationResultModel:
    p = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not p:
        raise ValueError(f"Project {project_id} not found")

    p.updated_at = datetime.utcnow()
    res = db.query(CalculationResultModel).filter(CalculationResultModel.project_id == project_id).first()
    if not res:
        res = CalculationResultModel(project_id=project_id)
        db.add(res)

    res.calculated_at = datetime.utcnow()
    res.summary = result.summary.model_dump()
    res.branches = [b.model_dump() for b in result.branches]
    res.cables = [c.model_dump() for c in result.cables]
    res.diagnostics = result.diagnostics.model_dump()
    res.bom = result.bom.model_dump() if result.bom else None
    res.nodes = [n.model_dump() for n in result.nodes]

    db.commit()
    return res


def get_cable_catalog(
    db: Session,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> List[CableCatalogItem]:
    query = db.query(CableCatalogModel)
    if category:
        query = query.filter(CableCatalogModel.category == category)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CableCatalogModel.code.ilike(search_fmt),
                CableCatalogModel.designation.ilike(search_fmt),
                CableCatalogModel.category_label.ilike(search_fmt),
                CableCatalogModel.standard.ilike(search_fmt),
            )
        )

    items = query.order_by(CableCatalogModel.category, CableCatalogModel.size_mm2).all()
    return [
        CableCatalogItem(
            code=item.code,
            category=item.category,
            category_label=item.category_label,
            voltage=item.voltage,
            cores=item.cores,
            size_mm2=item.size_mm2,
            conductor_type=item.conductor_type,
            insulation_sheath=item.insulation_sheath,
            standard=item.standard,
            designation=item.designation,
            od_mm=item.od_mm,
            weight_kg_km=item.weight_kg_km,
            current_air_a=item.current_air_a,
        )
        for item in items
    ]


def add_cable_to_catalog(db: Session, item: CableCatalogItem) -> CableCatalogItem:
    existing = db.query(CableCatalogModel).filter(CableCatalogModel.code == item.code).first()
    if existing:
        existing.category = item.category
        existing.category_label = item.category_label
        existing.voltage = item.voltage
        existing.cores = item.cores
        existing.size_mm2 = item.size_mm2
        existing.conductor_type = item.conductor_type
        existing.insulation_sheath = item.insulation_sheath
        existing.standard = item.standard
        existing.designation = item.designation
        existing.od_mm = item.od_mm
        existing.weight_kg_km = item.weight_kg_km
        existing.current_air_a = item.current_air_a
    else:
        new_item = CableCatalogModel(
            code=item.code,
            category=item.category,
            category_label=item.category_label,
            voltage=item.voltage,
            cores=item.cores,
            size_mm2=item.size_mm2,
            conductor_type=item.conductor_type,
            insulation_sheath=item.insulation_sheath,
            standard=item.standard,
            designation=item.designation,
            od_mm=item.od_mm,
            weight_kg_km=item.weight_kg_km,
            current_air_a=item.current_air_a,
        )
        db.add(new_item)

    db.commit()
    return item
