export type CableCategory = 'power' | 'control' | 'signal' | 'data' | 'bus';

export type CableFormation = 'trefoil' | 'flat_touching' | 'flat_spaced';

export type BranchOrientation = 'horizontal' | 'vertical';

export type FittingType =
  | 'horizontal_tee'
  | 'horizontal_half_tee'
  | 'horizontal_elbow_90'
  | 'horizontal_elbow_45'
  | 'horizontal_cross'
  | 'vertical_inside_riser'
  | 'vertical_outside_riser'
  | 'vertical_inside_riser_45'
  | 'vertical_outside_riser_45'
  | 'vertical_downward_tee'
  | 'skewed_downward_bend'
  | 'electrical_board_outlet'
  | 'straight_coupler'
  | 'closed_bend'
  | 'end_cap'
  | 'none';

export type ReducerType = 'concentric' | 'eccentric_left' | 'eccentric_right' | 'height_reducer';

export interface NodePortReducer {
  branch_id: string;
  from_width_mm: number;
  to_width_mm: number;
  height_mm: number;
  reducer_type: ReducerType;
  enabled: boolean;
}

export interface NodeFittingConfig {
  node_id: string;
  fitting_type?: FittingType;
  user_override?: boolean;
  notes?: string;
  include_cover?: boolean;
  quantity_multiplier?: number;
  reducers?: Record<string, NodePortReducer>; // keyed by branch_id
}

export interface ConnectedBranchInfo {
  branch_id: string;
  node_from: string;
  node_to: string;
  level: string;
  branch_type: BranchOrientation;
  width_mm: number;
  height_mm: number;
  length_m: number;
}

export interface CalculatedNodeFitting {
  node_id: string;
  level: string;
  connected_branches: ConnectedBranchInfo[];
  detected_fitting_type: FittingType;
  selected_fitting_type: FittingType;
  user_override: boolean;
  width_mm: number; // adapted to max branch width
  height_mm: number;
  reducers: Record<string, NodePortReducer>;
  include_cover?: boolean;
  quantity_multiplier?: number;
  notes?: string;
}

export type SupportMountingType = 'ceiling_trapeze' | 'wall_cantilever';

export interface CalculationParameters {
  spare_margin_pct: number;
  control_fill_pct: number;
  default_tray_height_mm: number;
  add_metallic_divider: boolean;
  divider_width_mm: number;
  default_power_od_mm: number;
  default_control_od_mm: number;
  default_signal_od_mm: number;
  default_data_od_mm: number;
  default_global_od_mm: number;
  custom_od_by_type?: Record<string, number>;
  single_core_power_formation?: CableFormation;
  control_cable_laying_method?: 'multi_layer' | 'single_layer';
  structural_safety_margin_pct?: number;
  tray_sheet_thickness_mm?: number;
  default_mounting_type?: SupportMountingType;
}

export interface Branch {
  branch_id: string;
  node_from: string;
  node_to: string;
  level: string;
  branch_type: BranchOrientation;
  length_m: number;
  tray_height_mm?: number;
  mounting_type?: SupportMountingType;
  weight_override_kg_m?: number;
}

export interface Cable {
  cable_tag: string;
  source_node: string;
  dest_node: string;
  cable_type: string;
  od_mm?: number;
  count: number;
  category?: CableCategory;
  formation?: CableFormation;
  source_panel?: string;
  dest_panel?: string;
  weight_kg_km?: number;
  weight_kg_m?: number;
}

export interface CableRoutedDetail {
  cable_tag: string;
  source_node: string;
  dest_node: string;
  cable_type: string;
  od_mm: number;
  count: number;
  width_contribution_mm: number;
  formation?: CableFormation;
  source_panel?: string;
  dest_panel?: string;
  weight_kg_m?: number;
  total_weight_kg?: number;
}

export interface BranchSizingResult {
  branch_id: string;
  node_from: string;
  node_to: string;
  level: string;
  branch_type: string;
  length_m: number;
  tray_height_mm: number;
  cable_count: number;
  power_cables_count: number;
  control_cables_count: number;
  data_cables_count: number;
  power_width_mm: number;
  control_width_mm: number;
  data_width_mm: number;
  barrier_width_mm: number;
  calculated_width_mm: number;
  recommended_commercial_width_mm: number;
  fill_ratio_pct: number;
  cables_routed: string[];
  cables_detail?: CableRoutedDetail[];
  status: 'OK' | 'OVERFILL_SPLIT_TIER' | 'EMPTY' | string;
  warnings?: string[];
  cable_load_kg_m?: number;
  tray_dead_load_kg_m?: number;
  total_load_kg_m?: number;
  recommended_support_span_m?: number;
  supports_count?: number;
  support_mounting_type?: SupportMountingType;
  load_utilization_pct?: number;
}

export interface CableRoutingResult {
  cable_tag: string;
  source_node: string;
  dest_node: string;
  cable_type: string;
  od_mm: number;
  count: number;
  status: 'ROUTED' | 'UNROUTED' | 'LOCAL';
  path_nodes?: string[];
  path_branches?: string[];
  total_length_m: number;
  unrouted_reason?: string | null;
  source_panel?: string;
  dest_panel?: string;
}

export interface CalculationSummary {
  total_cables_routed: number;
  unrouted_cables: string[];
  total_branches: number;
  max_fill_branch_id?: string | null;
  max_fill_pct: number;
  total_cable_length_routed_m: number;
  total_tray_length_m: number;
  overfilled_branches_count: number;
}

export interface Diagnostics {
  disconnected_nodes: string[];
  missing_nodes_referenced_in_cables: string[];
  unrouted_cables_details: CableRoutingResult[];
}

export interface TrayBomItem {
  width_mm: number;
  height_mm: number;
  branch_type: BranchOrientation;
  total_length_m: number;
  section_count_3m: number;
  branch_count: number;
}

export interface AccessoryBomItem {
  item_name: string;
  category: 'Coupler' | 'Support' | 'Divider' | 'Hardware';
  description: string;
  quantity: number;
  unit: string;
}

export interface CableBomItem {
  cable_type: string;
  cable_count: number;
  total_routed_length_m: number;
  avg_length_m: number;
}

export interface FittingBomItem {
  fitting_type: FittingType;
  fitting_name: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  nodes: string[];
}

export interface ReducerBomItem {
  from_width_mm: number;
  to_width_mm: number;
  height_mm: number;
  reducer_type: ReducerType;
  quantity: number;
  locations: { node_id: string; branch_id: string }[];
}

export interface BillOfMaterials {
  trays: TrayBomItem[];
  accessories: AccessoryBomItem[];
  cables_summary: CableBomItem[];
  fittings?: FittingBomItem[];
  reducers?: ReducerBomItem[];
  total_tray_length_m: number;
  total_sections_3m: number;
  total_cable_length_m: number;
  total_fittings_count?: number;
  total_reducers_count?: number;
  total_cable_weight_kg?: number;
  total_tray_weight_kg?: number;
  total_installation_weight_kg?: number;
  total_supports_count?: number;
}

export interface CalculationResponse {
  summary: CalculationSummary;
  branches: BranchSizingResult[];
  cables: CableRoutingResult[];
  diagnostics: Diagnostics;
  bom?: BillOfMaterials;
  nodes?: CalculatedNodeFitting[];
}

export interface CalculationRequest {
  parameters: CalculationParameters;
  branches: Branch[];
  cables: Cable[];
  node_fittings?: Record<string, NodeFittingConfig>;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  parameters: CalculationParameters;
  branches: Branch[];
  cables: Cable[];
  node_fittings?: Record<string, NodeFittingConfig>;
}

export interface ColumnMappingConfig {
  cableTagCol: string;
  cableSourceCol: string;
  cableDestCol: string;
  cableTypeCol: string;
  cableOdCol: string;
  cableCountCol: string;

  branchIdCol: string;
  branchFromCol: string;
  branchToCol: string;
  branchLevelCol: string;
  branchTypeCol: string;
  branchLengthCol: string;
  branchHeightCol: string;

  typeCategoryMap: Record<string, CableCategory>;
}
