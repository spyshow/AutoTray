from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from .database import Base


class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(64), nullable=False)
    description = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    parameters = relationship(
        "ProjectParametersModel",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    branches = relationship(
        "BranchModel",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="BranchModel.id",
    )
    cables = relationship(
        "CableModel",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="CableModel.id",
    )
    node_fittings = relationship(
        "NodeFittingModel",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="NodeFittingModel.id",
    )
    calculation_result = relationship(
        "CalculationResultModel",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )


class ProjectParametersModel(Base):
    __tablename__ = "project_parameters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    spare_margin_pct = Column(Float, default=20.0, nullable=False)
    control_fill_pct = Column(Float, default=40.0, nullable=False)
    default_tray_height_mm = Column(Float, default=60.0, nullable=False)
    add_metallic_divider = Column(Boolean, default=False, nullable=False)
    divider_width_mm = Column(Float, default=15.0, nullable=False)
    default_power_od_mm = Column(Float, default=25.0, nullable=False)
    default_control_od_mm = Column(Float, default=14.0, nullable=False)
    default_signal_od_mm = Column(Float, default=10.0, nullable=False)
    default_data_od_mm = Column(Float, default=8.5, nullable=False)
    default_global_od_mm = Column(Float, default=15.0, nullable=False)
    custom_od_by_type = Column(JSON, default=dict, nullable=False)
    single_core_power_formation = Column(String(32), default="trefoil", nullable=False)
    control_cable_laying_method = Column(String(32), default="multi_layer", nullable=False)
    structural_safety_margin_pct = Column(Float, default=15.0, nullable=False)
    tray_sheet_thickness_mm = Column(Float, default=1.5, nullable=False)
    default_mounting_type = Column(String(32), default="ceiling_trapeze", nullable=False)

    project = relationship("ProjectModel", back_populates="parameters")


class BranchModel(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    branch_id = Column(String(64), nullable=False)
    node_from = Column(String(64), nullable=False)
    node_to = Column(String(64), nullable=False)
    level = Column(String(64), default="Level 1", nullable=False)
    branch_type = Column(String(32), default="horizontal", nullable=False)
    length_m = Column(Float, nullable=False)
    tray_height_mm = Column(Float, nullable=True)
    mounting_type = Column(String(64), nullable=True)
    weight_override_kg_m = Column(Float, nullable=True)

    project = relationship("ProjectModel", back_populates="branches")


class CableModel(Base):
    __tablename__ = "cables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    cable_tag = Column(String(128), nullable=False)
    source_node = Column(String(64), nullable=False)
    dest_node = Column(String(64), nullable=False)
    cable_type = Column(String(128), default="power", nullable=False)
    od_mm = Column(Float, nullable=True)
    count = Column(Integer, default=1, nullable=False)
    category = Column(String(32), nullable=True)
    formation = Column(String(32), nullable=True)
    source_panel = Column(String(64), nullable=True)
    dest_panel = Column(String(64), nullable=True)
    weight_kg_km = Column(Float, nullable=True)
    weight_kg_m = Column(Float, nullable=True)

    project = relationship("ProjectModel", back_populates="cables")


class NodeFittingModel(Base):
    __tablename__ = "node_fittings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    node_id = Column(String(64), nullable=False)
    fitting_type = Column(String(64), nullable=True)
    user_override = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    include_cover = Column(Boolean, default=False, nullable=False)
    quantity_multiplier = Column(Integer, nullable=True)
    reducers = Column(JSON, default=dict, nullable=False)

    project = relationship("ProjectModel", back_populates="node_fittings")


class CableCatalogModel(Base):
    __tablename__ = "cable_catalog"

    code = Column(String(64), primary_key=True, index=True)
    category = Column(String(64), nullable=False, index=True)
    category_label = Column(String(128), nullable=False)
    voltage = Column(String(32), nullable=False)
    cores = Column(Integer, nullable=False)
    size_mm2 = Column(Float, nullable=False)
    conductor_type = Column(String(64), nullable=False)
    insulation_sheath = Column(String(64), nullable=False)
    standard = Column(String(128), nullable=False)
    designation = Column(String(128), nullable=False)
    od_mm = Column(Float, nullable=False)
    weight_kg_km = Column(Float, nullable=True)
    current_air_a = Column(Float, nullable=True)


class CalculationResultModel(Base):
    __tablename__ = "calculation_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    summary = Column(JSON, nullable=False)
    branches = Column(JSON, nullable=False)
    cables = Column(JSON, nullable=False)
    diagnostics = Column(JSON, nullable=False)
    bom = Column(JSON, nullable=True)
    nodes = Column(JSON, nullable=True)

    project = relationship("ProjectModel", back_populates="calculation_result")
