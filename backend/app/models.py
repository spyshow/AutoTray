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


class Branch(BaseModel):
    branch_id: str = Field(..., description="Unique tray segment identifier", validation_alias=AliasChoices("branch_id", "id", "tray_id"))
    node_from: str = Field(..., description="Starting node / junction", validation_alias=AliasChoices("node_from", "from_node", "from"))
    node_to: str = Field(..., description="Ending node / junction", validation_alias=AliasChoices("node_to", "to_node", "to"))
    level: str = Field("Level 1", description="Floor / Elevation level (e.g. Level 1, Level 2, Transition)")
    branch_type: str = Field("horizontal", description="Orientation: horizontal or vertical (riser)", validation_alias=AliasChoices("branch_type", "type", "orientation"))
    length_m: float = Field(..., gt=0.0, description="Tray segment length in meters", validation_alias=AliasChoices("length_m", "length", "distance_m", "distance"))
    tray_height_mm: Optional[float] = Field(None, description="Tray side height in mm (defaults to global setting)", validation_alias=AliasChoices("tray_height_mm", "height_mm", "tray_height", "height"))

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


class BillOfMaterials(BaseModel):
    trays: List[TrayBomItem] = []
    accessories: List[AccessoryBomItem] = []
    cables_summary: List[CableBomItem] = []
    total_tray_length_m: float = 0.0
    total_sections_3m: int = 0
    total_cable_length_m: float = 0.0


class CalculationResponse(BaseModel):
    summary: CalculationSummary
    branches: List[BranchSizingResult]
    cables: List[CableRoutingResult] = []
    diagnostics: Diagnostics = Field(default_factory=Diagnostics)
    bom: Optional[BillOfMaterials] = None
