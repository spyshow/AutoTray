from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, AliasChoices


class CableTypeCategory(str, Enum):
    POWER = "power"
    CONTROL = "control"
    SIGNAL = "signal"
    DATA = "data"
    BUS = "bus"


class BranchType(str, Enum):
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"


class BranchStatus(str, Enum):
    OK = "OK"
    OVERFILL_SPLIT_TIER = "OVERFILL_SPLIT_TIER"
    EMPTY = "EMPTY"


class FittingType(str, Enum):
    HORIZONTAL_TEE = "horizontal_tee"
    HORIZONTAL_HALF_TEE = "horizontal_half_tee"
    HORIZONTAL_ELBOW_90 = "horizontal_elbow_90"
    HORIZONTAL_ELBOW_45 = "horizontal_elbow_45"
    HORIZONTAL_CROSS = "horizontal_cross"
    VERTICAL_INSIDE_RISER = "vertical_inside_riser"
    VERTICAL_OUTSIDE_RISER = "vertical_outside_riser"
    VERTICAL_INSIDE_RISER_45 = "vertical_inside_riser_45"
    VERTICAL_OUTSIDE_RISER_45 = "vertical_outside_riser_45"
    VERTICAL_DOWNWARD_TEE = "vertical_downward_tee"
    SKEWED_DOWNWARD_BEND = "skewed_downward_bend"
    ELECTRICAL_BOARD_OUTLET = "electrical_board_outlet"
    STRAIGHT_COUPLER = "straight_coupler"
    CLOSED_BEND = "closed_bend"
    END_CAP = "end_cap"
    NONE = "none"


class ReducerType(str, Enum):
    CONCENTRIC = "concentric"
    ECCENTRIC_LEFT = "eccentric_left"
    ECCENTRIC_RIGHT = "eccentric_right"
    HEIGHT_REDUCER = "height_reducer"


class NodePortReducer(BaseModel):
    branch_id: str
    from_width_mm: int
    to_width_mm: int
    height_mm: float
    reducer_type: str = "concentric"
    enabled: bool = True


class NodeFittingConfig(BaseModel):
    node_id: str
    fitting_type: Optional[str] = None
    user_override: bool = False
    notes: Optional[str] = None
    include_cover: bool = False
    quantity_multiplier: Optional[int] = None
    reducers: Dict[str, NodePortReducer] = Field(default_factory=dict)


class ConnectedBranchInfo(BaseModel):
    branch_id: str
    node_from: str
    node_to: str
    level: str
    branch_type: str
    width_mm: int
    height_mm: float
    length_m: float


class CalculatedNodeFitting(BaseModel):
    node_id: str
    level: str = "Level 1"
    connected_branches: List[ConnectedBranchInfo] = []
    detected_fitting_type: str
    selected_fitting_type: str
    user_override: bool = False
    width_mm: int
    height_mm: float
    reducers: Dict[str, NodePortReducer] = Field(default_factory=dict)
    include_cover: bool = False
    quantity_multiplier: int = 1
    notes: Optional[str] = None


class CalculationParameters(BaseModel):
    spare_margin_pct: float = Field(20.0, ge=0.0, le=200.0, description="Spare margin percentage (e.g. 20%)")
    control_fill_pct: float = Field(40.0, gt=0.0, le=100.0, description="Maximum control cable fill factor (e.g. 40%)")
    default_tray_height_mm: float = Field(60.0, gt=0.0, description="Default cable tray side height in mm")
    add_metallic_divider: bool = Field(False, description="Add physical barrier between power and control/data")
    divider_width_mm: float = Field(15.0, ge=0.0, description="Width of metallic divider in mm")
    default_power_od_mm: float = Field(25.0, gt=0.0, description="Default Power cable outer diameter in mm")
    default_control_od_mm: float = Field(14.0, gt=0.0, description="Default Control cable outer diameter in mm")
    default_signal_od_mm: float = Field(10.0, gt=0.0, description="Default Signal cable outer diameter in mm")
    default_data_od_mm: float = Field(8.5, gt=0.0, description="Default Data/Bus cable outer diameter in mm")
    default_global_od_mm: float = Field(15.0, gt=0.0, description="Global fallback cable outer diameter in mm")
    custom_od_by_type: Dict[str, float] = Field(default_factory=dict, description="Custom cable type to default OD mapping")
    single_core_power_formation: str = Field("trefoil", description="Installation method for 1-core power cables: 'trefoil', 'flat_touching', or 'flat_spaced'")
    control_cable_laying_method: str = Field("multi_layer", description="Installation method for control/signal/data cables: 'multi_layer' (stacked by area) or 'single_layer' (flat touching, width = OD)")
    structural_safety_margin_pct: float = Field(15.0, ge=0.0, le=100.0, description="Structural safety load margin (e.g. 15%)")
    tray_sheet_thickness_mm: float = Field(1.5, ge=0.5, le=5.0, description="Cable tray sheet steel thickness in mm")
    default_mounting_type: str = Field("ceiling_trapeze", description="Default support mounting style: ceiling_trapeze or wall_cantilever")


class Branch(BaseModel):
    branch_id: str = Field(..., description="Unique tray segment identifier", validation_alias=AliasChoices("branch_id", "id", "tray_id"))
    node_from: str = Field(..., description="Starting node / junction", validation_alias=AliasChoices("node_from", "from_node", "from"))
    node_to: str = Field(..., description="Ending node / junction", validation_alias=AliasChoices("node_to", "to_node", "to"))
    level: str = Field("Level 1", description="Floor / Elevation level (e.g. Level 1, Level 2, Transition)")
    branch_type: str = Field("horizontal", description="Orientation: horizontal or vertical (riser)", validation_alias=AliasChoices("branch_type", "type", "orientation"))
    length_m: float = Field(..., gt=0.0, description="Tray segment length in meters", validation_alias=AliasChoices("length_m", "length", "distance_m", "distance"))
    tray_height_mm: Optional[float] = Field(None, description="Tray side height in mm (defaults to global setting)", validation_alias=AliasChoices("tray_height_mm", "height_mm", "tray_height", "height"))
    mounting_type: Optional[str] = Field(None, description="Support mounting style: ceiling_trapeze or wall_cantilever", validation_alias=AliasChoices("mounting_type", "mounting", "support_type"))
    weight_override_kg_m: Optional[float] = Field(None, description="Optional manual override for branch linear weight", validation_alias=AliasChoices("weight_override_kg_m", "weight_override"))

    @field_validator("node_from", "node_to", mode="before")
    @classmethod
    def strip_nodes(cls, v: Any) -> str:
        return str(v or "").strip()

    @field_validator("branch_type", mode="before")
    @classmethod
    def normalize_branch_type(cls, v: Any) -> str:
        s = str(v or "").strip().lower()
        if "vert" in s or "riser" in s:
            return "vertical"
        return "horizontal"

    @field_validator("tray_height_mm", mode="before")
    @classmethod
    def validate_tray_height(cls, v: Any) -> Optional[float]:
        if v is None or v == "":
            return None
        try:
            val = float(v)
            return val if val > 0 else None
        except (ValueError, TypeError):
            return None


class Cable(BaseModel):
    cable_tag: str = Field(..., description="Unique cable identifier", validation_alias=AliasChoices("cable_tag", "tag", "cable_id", "id"))
    source_node: str = Field(..., description="Origin node / panel / equipment", validation_alias=AliasChoices("source_node", "from_node", "source", "from", "origin"))
    dest_node: str = Field(..., description="Destination node / equipment", validation_alias=AliasChoices("dest_node", "to_node", "destination", "to", "target"))
    cable_type: str = Field("power", description="Cable specification or type e.g. 4x1.5 mm², 4x50, Cat6", validation_alias=AliasChoices("cable_type", "type", "specification", "spec", "cross_section", "size", "category", "class"))
    od_mm: Optional[float] = Field(None, description="Overall cable outer diameter in mm (uses default settings if omitted or <=0)", validation_alias=AliasChoices("od_mm", "od", "diameter", "dia_mm", "dia"))
    count: int = Field(1, ge=1, description="Number of identical cables", validation_alias=AliasChoices("count", "qty", "quantity"))
    category: Optional[str] = Field(None, description="Calculation category: power, control, signal, data, bus", validation_alias=AliasChoices("category", "calc_category"))
    formation: Optional[str] = Field(None, description="Installation method for 1-core power: 'trefoil', 'flat_touching', 'flat_spaced'", validation_alias=AliasChoices("formation", "installation_method", "layout"))
    source_panel: Optional[str] = Field(None, description="Owning or source panel for field devices", validation_alias=AliasChoices("source_panel", "src_panel", "from_panel"))
    dest_panel: Optional[str] = Field(None, description="Owning or destination panel for field devices", validation_alias=AliasChoices("dest_panel", "dst_panel", "to_panel"))
    weight_kg_km: Optional[float] = Field(None, description="Cable weight in kg/km", validation_alias=AliasChoices("weight_kg_km", "weight_km", "wt_km"))
    weight_kg_m: Optional[float] = Field(None, description="Cable weight in kg/m", validation_alias=AliasChoices("weight_kg_m", "weight", "weight_m", "wt_m"))

    @field_validator("source_node", "dest_node", "cable_tag", mode="before")
    @classmethod
    def strip_nodes(cls, v: Any) -> str:
        return str(v or "").strip()

    @field_validator("od_mm", mode="before")
    @classmethod
    def validate_od(cls, v: Any) -> Optional[float]:
        if v is None or v == "":
            return None
        try:
            val = float(v)
            return val if val > 0 else None
        except (ValueError, TypeError):
            return None

    @field_validator("cable_type", mode="before")
    @classmethod
    def normalize_cable_type(cls, v: Any) -> str:
        return str(v or "power").strip()


class CalculationRequest(BaseModel):
    parameters: CalculationParameters = Field(default_factory=CalculationParameters)
    branches: List[Branch] = Field(..., min_length=1)
    cables: List[Cable] = Field(..., min_length=1)
    node_fittings: Optional[Dict[str, NodeFittingConfig]] = None


class CableRoutedDetail(BaseModel):
    cable_tag: str
    source_node: str
    dest_node: str
    cable_type: str
    od_mm: float
    count: int
    width_contribution_mm: float
    formation: Optional[str] = None
    source_panel: Optional[str] = None
    dest_panel: Optional[str] = None
    weight_kg_m: float = 0.0
    total_weight_kg: float = 0.0


class BranchSizingResult(BaseModel):
    branch_id: str
    node_from: str
    node_to: str
    level: str = "Level 1"
    branch_type: str = "horizontal"
    length_m: float = 0.0
    tray_height_mm: float = 60.0
    cable_count: int
    power_cables_count: int
    control_cables_count: int
    data_cables_count: int = 0
    power_width_mm: float = 0.0
    control_width_mm: float = 0.0
    data_width_mm: float = 0.0
    barrier_width_mm: float = 0.0
    calculated_width_mm: float
    recommended_commercial_width_mm: int
    fill_ratio_pct: float
    cables_routed: List[str]
    cables_detail: List[CableRoutedDetail] = []
    status: str
    warnings: List[str] = Field(default_factory=list)
    cable_load_kg_m: float = 0.0
    tray_dead_load_kg_m: float = 0.0
    total_load_kg_m: float = 0.0
    recommended_support_span_m: float = 2.0
    supports_count: int = 0
    support_mounting_type: str = "ceiling_trapeze"
    load_utilization_pct: float = 0.0


class CableRoutingResult(BaseModel):
    cable_tag: str
    source_node: str
    dest_node: str
    cable_type: str
    od_mm: float
    count: int
    status: str  # "ROUTED" or "UNROUTED"
    path_nodes: List[str] = []
    path_branches: List[str] = []
    total_length_m: float = 0.0
    unrouted_reason: Optional[str] = None
    source_panel: Optional[str] = None
    dest_panel: Optional[str] = None


class CalculationSummary(BaseModel):
    total_cables_routed: int
    unrouted_cables: List[str]
    total_branches: int
    max_fill_branch_id: Optional[str] = None
    max_fill_pct: float = 0.0
    total_cable_length_routed_m: float = 0.0
    total_tray_length_m: float = 0.0
    overfilled_branches_count: int = 0


class Diagnostics(BaseModel):
    disconnected_nodes: List[str] = []
    missing_nodes_referenced_in_cables: List[str] = []
    unrouted_cables_details: List[CableRoutingResult] = []


class TrayBomItem(BaseModel):
    width_mm: int
    height_mm: float
    branch_type: str
    total_length_m: float
    section_count_3m: int
    branch_count: int


class AccessoryBomItem(BaseModel):
    item_name: str
    category: str
    description: str
    quantity: int
    unit: str = "pcs"


class CableBomItem(BaseModel):
    cable_type: str
    cable_count: int
    total_routed_length_m: float
    avg_length_m: float


class FittingBomItem(BaseModel):
    fitting_type: str
    fitting_name: str
    width_mm: int
    height_mm: float
    quantity: int
    nodes: List[str] = Field(default_factory=list)


class ReducerBomItem(BaseModel):
    from_width_mm: int
    to_width_mm: int
    height_mm: float
    reducer_type: str = "concentric"
    quantity: int
    locations: List[Dict[str, str]] = Field(default_factory=list)


class BillOfMaterials(BaseModel):
    trays: List[TrayBomItem] = []
    accessories: List[AccessoryBomItem] = []
    cables_summary: List[CableBomItem] = []
    fittings: List[FittingBomItem] = []
    reducers: List[ReducerBomItem] = []
    total_tray_length_m: float = 0.0
    total_sections_3m: int = 0
    total_cable_length_m: float = 0.0
    total_fittings_count: int = 0
    total_reducers_count: int = 0
    total_cable_weight_kg: float = 0.0
    total_tray_weight_kg: float = 0.0
    total_installation_weight_kg: float = 0.0
    total_supports_count: int = 0


class CalculationResponse(BaseModel):
    summary: CalculationSummary
    branches: List[BranchSizingResult]
    cables: List[CableRoutingResult] = []
    diagnostics: Diagnostics = Field(default_factory=Diagnostics)
    bom: Optional[BillOfMaterials] = None
    nodes: List[CalculatedNodeFitting] = []


class CableCatalogItem(BaseModel):
    code: str
    category: str
    category_label: str
    voltage: str
    cores: int
    size_mm2: float
    conductor_type: str
    insulation_sheath: str
    standard: str
    designation: str
    od_mm: float
    weight_kg_km: Optional[float] = None
    current_air_a: Optional[float] = None


class ProjectCreate(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    code: str = Field("PRJ-001")
    description: Optional[str] = ""
    parameters: Optional[CalculationParameters] = None
    branches: Optional[List[Branch]] = None
    cables: Optional[List[Cable]] = None
    node_fittings: Optional[Dict[str, NodeFittingConfig]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[CalculationParameters] = None
    branches: Optional[List[Branch]] = None
    cables: Optional[List[Cable]] = None
    node_fittings: Optional[Dict[str, NodeFittingConfig]] = None


class ProjectSummary(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = ""
    created_at: str
    updated_at: str
    branches_count: int = 0
    cables_count: int = 0


class ProjectDetail(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = ""
    created_at: str
    updated_at: str
    parameters: CalculationParameters
    branches: List[Branch] = []
    cables: List[Cable] = []
    node_fittings: Dict[str, NodeFittingConfig] = Field(default_factory=dict)
    latest_calculation: Optional[CalculationResponse] = None

