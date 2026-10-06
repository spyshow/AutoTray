import math
import re
from typing import List, Dict, Tuple, Set, Optional
import networkx as nx

from .models import (
    CalculationParameters,
    Branch,
    Cable,
    BranchSizingResult,
    CableRoutingResult,
    CableRoutedDetail,
    CalculationSummary,
    Diagnostics,
    CalculationResponse,
    BranchStatus,
    TrayBomItem,
    AccessoryBomItem,
    CableBomItem,
    FittingBomItem,
    ReducerBomItem,
    BillOfMaterials,
    NodeFittingConfig,
    NodePortReducer,
    ConnectedBranchInfo,
    CalculatedNodeFitting,
    FittingType,
    ReducerType,
)
from .cable_catalog import lookup_catalog_cable_od

FITTING_TYPE_NAMES = {
    "horizontal_tee": "Horizontal Tee (T-Piece)",
    "horizontal_elbow_90": "Horizontal 90° Elbow",
    "horizontal_elbow_45": "Horizontal 45° Elbow",
    "horizontal_cross": "Horizontal 4-Way Cross",
    "vertical_inside_riser": "Vertical Inside Riser Bend",
    "vertical_outside_riser": "Vertical Outside Riser Bend",
    "straight_coupler": "Straight Splice Coupler",
    "end_cap": "End Cap / Terminal Drop",
    "none": "None / Pass-Through",
}

STANDARD_COMMERCIAL_WIDTHS = [50, 75, 100, 150, 200, 300, 400, 450, 500, 600, 700]


def get_effective_cable_od(cable: Cable, parameters: CalculationParameters) -> float:
    """Return explicit cable OD or resolve it from default settings / technical catalog based on cable type."""
    if cable.od_mm is not None and cable.od_mm > 0:
        return cable.od_mm

    c_type_raw = str(cable.cable_type or "").strip()
    c_type_lower = c_type_raw.lower()

    if parameters.custom_od_by_type:
        for k, v in parameters.custom_od_by_type.items():
            k_clean = k.strip().lower()
            if (k_clean == c_type_lower or k_clean in c_type_lower or c_type_lower in k_clean) and v > 0:
                return float(v)

    # Technical handbook catalog lookup (e.g. 4x50 -> 32.1, 4x240 -> 70.2, 3x16 -> 18.4)
    catalog_od = lookup_catalog_cable_od(c_type_raw)
    if catalog_od is not None and catalog_od > 0:
        return catalog_od

    if any(k in c_type_lower for k in ["pwr", "power", "feeder", "motor", "mv", "lv", "400v"]):
        return parameters.default_power_od_mm
    elif any(k in c_type_lower for k in ["sig", "signal", "sensor", "thermocouple", "instrument"]):
        return parameters.default_signal_od_mm
    elif any(k in c_type_lower for k in ["data", "bus", "eth", "net", "cat", "fiber", "prof", "modbus"]):
        return parameters.default_data_od_mm
    elif any(k in c_type_lower for k in ["ctrl", "control", "24v"]):
        return parameters.default_control_od_mm

    return parameters.default_global_od_mm


def is_single_core_power(c: Cable) -> bool:
    """Detect if a power cable is single-core (1-core)."""
    s = str(c.cable_type or "").strip().lower()
    if re.search(r"^(?:1\s*[xX\*\/]|1\s*(?:c|core|cores)\b|1c_)", s):
        return True
    if any(k in s for k in ["1 core", "1core", "1-core", "single core", "single-core"]):
        return True
    return False


def get_single_core_formation(c: Cable, default_formation: Optional[str]) -> str:
    """Resolve formation ('trefoil', 'flat_touching', 'flat_spaced') for single-core cable."""
    if getattr(c, "formation", None):
        f = str(c.formation).strip().lower()
        if f in ("trefoil", "trifoly", "tri"):
            return "trefoil"
        if "touch" in f or "near" in f:
            return "flat_touching"
        if "space" in f:
            return "flat_spaced"
    f_def = str(default_formation or "trefoil").strip().lower()
    if "touch" in f_def or "near" in f_def:
        return "flat_touching"
    if "space" in f_def:
        return "flat_spaced"
    return "trefoil"


def calculate_power_cable_width(c: Cable, od_mm: float, default_formation: Optional[str]) -> tuple[float, str, float]:
    """
    Calculate floor width contribution (mm), resolved formation, and vertical bundle height (mm).
    - Multi-core power: single layer with 1 OD spacing (w = 2.0 * OD * count, h = OD).
    - Single-core power:
      * trefoil ('trifoly'):
        triplets = count // 3
        remainder = count % 3
        width = triplets * 2.0 * OD + remainder * (2/3 if count == 1 else 1.0) * OD
        bundle_height = OD * (1.0 + sqrt(3)/2.0) ≈ 1.866 * OD
      * flat_touching ('near each other'):
        width = 1.0 * OD * count
        bundle_height = OD
      * flat_spaced:
        width = 2.0 * OD * count
        bundle_height = OD
    """
    if not is_single_core_power(c):
        return (od_mm * 2.0 * c.count, "flat_spaced", od_mm)

    formation = get_single_core_formation(c, default_formation)
    if formation == "trefoil":
        full_trefoils = c.count // 3
        rem = c.count % 3
        rem_factor = (2.0 / 3.0) if c.count == 1 else 1.0
        w = (full_trefoils * 2.0 * od_mm) + (rem * rem_factor * od_mm)
        bundle_h = od_mm * (1.0 + (math.sqrt(3.0) / 2.0))
        return (w, "trefoil", bundle_h)
    elif formation == "flat_touching":
        return (od_mm * 1.0 * c.count, "flat_touching", od_mm)
    else:  # flat_spaced
        return (od_mm * 2.0 * c.count, "flat_spaced", od_mm)


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates Levenshtein edit distance between two strings."""
    if s1 == s2:
        return 0
    if not s1:
        return len(s2)
    if not s2:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            ins = prev[j + 1] + 1
            dele = curr[j] + 1
            sub = prev[j] + (c1 != c2)
            curr.append(min(ins, dele, sub))
        prev = curr
    return prev[-1]


def find_node_suggestion(target: str, existing_nodes: Set[str], exclude: Optional[str] = None) -> Optional[str]:
    """Finds the most likely intended node name if there is a typo or transposition."""
    target_clean = target.strip().upper()
    exclude_clean = exclude.strip().upper() if exclude else None
    best_candidate = None
    min_dist = 999
    # Sort nodes for deterministic selection
    for n in sorted(existing_nodes):
        n_clean = n.strip().upper()
        if exclude_clean and n_clean == exclude_clean:
            continue
        if n_clean == target_clean:
            return n
        d = levenshtein_distance(target_clean, n_clean)
        if d <= 2 and d < min_dist:
            min_dist = d
            best_candidate = n
    # If no candidate found excluding exclude, try including it as fallback
    if not best_candidate and exclude_clean:
        for n in sorted(existing_nodes):
            n_clean = n.strip().upper()
            d = levenshtein_distance(target_clean, n_clean)
            if d <= 2 and d < min_dist:
                min_dist = d
                best_candidate = n
    return best_candidate


def detect_default_fitting_type(connected: List[ConnectedBranchInfo]) -> str:
    count = len(connected)
    if count == 0:
        return "none"
    if count == 1:
        return "end_cap"
    if count == 2:
        has_vertical = any(b.branch_type == "vertical" for b in connected)
        has_horizontal = any(b.branch_type == "horizontal" for b in connected)
        levels = {b.level for b in connected}
        if (has_vertical and has_horizontal) or len(levels) > 1:
            return "vertical_inside_riser"
        return "horizontal_elbow_90"
    if count == 3:
        return "horizontal_tee"
    return "horizontal_cross"


def calculate_network_node_fittings(
    branches: List[Branch],
    branch_results: Optional[List[BranchSizingResult]] = None,
    user_configs: Optional[Dict[str, NodeFittingConfig]] = None,
    default_tray_height_mm: float = 60.0,
) -> List[CalculatedNodeFitting]:
    sizing_map = {r.branch_id: r for r in (branch_results or [])}
    node_branches_map: Dict[str, List[ConnectedBranchInfo]] = {}
    node_levels_map: Dict[str, Set[str]] = {}

    for b in branches:
        f = (b.node_from or "").strip()
        t = (b.node_to or "").strip()
        res = sizing_map.get(b.branch_id)
        width = res.recommended_commercial_width_mm if res else 100
        height = b.tray_height_mm or default_tray_height_mm or 60.0

        b_info = ConnectedBranchInfo(
            branch_id=b.branch_id,
            node_from=f,
            node_to=t,
            level=b.level or "Level 1",
            branch_type=b.branch_type or "horizontal",
            width_mm=width,
            height_mm=height,
            length_m=b.length_m or 0.0,
        )

        if f:
            node_branches_map.setdefault(f, []).append(b_info)
            node_levels_map.setdefault(f, set()).add(b.level or "Level 1")
        if t and t != f:
            node_branches_map.setdefault(t, []).append(b_info)
            node_levels_map.setdefault(t, set()).add(b.level or "Level 1")

    calculated_nodes: List[CalculatedNodeFitting] = []
    for node_id, connected in node_branches_map.items():
        levels = sorted(list(node_levels_map.get(node_id, {"Level 1"})))
        level_display = " / ".join(levels)
        detected_type = detect_default_fitting_type(connected)
        user_cfg = user_configs.get(node_id) if user_configs else None
        selected_type = user_cfg.fitting_type if (user_cfg and user_cfg.fitting_type) else detected_type
        user_override = bool(user_cfg and user_cfg.user_override and user_cfg.fitting_type)

        max_width = max([b.width_mm for b in connected], default=100)
        max_height = max([b.height_mm for b in connected], default=default_tray_height_mm)

        reducers: Dict[str, NodePortReducer] = {}
        for b in connected:
            if b.width_mm < max_width and selected_type != "none":
                saved_reducer = user_cfg.reducers.get(b.branch_id) if (user_cfg and user_cfg.reducers) else None
                reducers[b.branch_id] = NodePortReducer(
                    branch_id=b.branch_id,
                    from_width_mm=max_width,
                    to_width_mm=b.width_mm,
                    height_mm=max_height,
                    reducer_type=saved_reducer.reducer_type if saved_reducer else "concentric",
                    enabled=saved_reducer.enabled if saved_reducer is not None else True,
                )

        calculated_nodes.append(
            CalculatedNodeFitting(
                node_id=node_id,
                level=level_display,
                connected_branches=connected,
                detected_fitting_type=detected_type,
                selected_fitting_type=selected_type,
                user_override=user_override,
                width_mm=max_width,
                height_mm=max_height,
                reducers=reducers,
                notes=user_cfg.notes if user_cfg else None,
            )
        )

    calculated_nodes.sort(key=lambda n: n.node_id)
    return calculated_nodes


def solve_routing_and_sizing(
    parameters: CalculationParameters,
    branches: List[Branch],
    cables: List[Cable],
    node_fittings: Optional[Dict[str, NodeFittingConfig]] = None,
) -> CalculationResponse:
    # 1. Build Undirected Weighted Graph with Canonical Node Mapping
    G = nx.Graph()
    edge_to_branch: Dict[Tuple[str, str], Branch] = {}
    branch_map: Dict[str, Branch] = {}
    canonical_nodes: Dict[str, str] = {}  # UPPERCASE -> Original Display Case
    self_loop_branches: Dict[str, List[Branch]] = {}  # node -> branches where node_from == node_to

    default_h = parameters.default_tray_height_mm if parameters.default_tray_height_mm > 0 else 60.0

    def get_canonical(node_str: str) -> str:
        s = node_str.strip()
        key = s.upper()
        if key not in canonical_nodes:
            canonical_nodes[key] = s
        return canonical_nodes[key]

    for b in branches:
        branch_map[b.branch_id] = b
        u = get_canonical(b.node_from)
        v = get_canonical(b.node_to)

        # Ensure nodes exist in graph
        G.add_node(u, level=b.level)
        G.add_node(v, level=b.level)

        tray_h = b.tray_height_mm if (b.tray_height_mm is not None and b.tray_height_mm > 0) else default_h
        seg_len = max(b.length_m, 0.01)

        # If this is a local self-loop branch (e.g. from P101 to P101)
        if u == v:
            self_loop_branches.setdefault(u, []).append(b)
            continue

        # Handle parallel branches between the same two nodes: keep shorter branch for routing
        if G.has_edge(u, v):
            existing_len = G[u][v].get("length_m", float("inf"))
            if seg_len < existing_len:
                G[u][v]["branch_id"] = b.branch_id
                G[u][v]["length_m"] = seg_len
                G[u][v]["tray_height_mm"] = tray_h
                G[u][v]["branch_type"] = b.branch_type
                G[u][v]["level"] = b.level
                edge_to_branch[(u, v)] = b
                edge_to_branch[(v, u)] = b
        else:
            G.add_edge(
                u,
                v,
                branch_id=b.branch_id,
                length_m=seg_len,
                tray_height_mm=tray_h,
                branch_type=b.branch_type,
                level=b.level,
            )
            edge_to_branch[(u, v)] = b
            edge_to_branch[(v, u)] = b

    # Diagnostics: missing nodes and disconnected nodes
    all_graph_nodes = set(G.nodes).union(set(self_loop_branches.keys()))
    missing_nodes: Set[str] = set()
    unrouted_cables: List[str] = []
    cable_routing_results: List[CableRoutingResult] = []

    # Map each branch_id to list of routed cables passing through it
    branch_routed_cables: Dict[str, List[Cable]] = {b.branch_id: [] for b in branches}

    total_routed_cable_length = 0.0

    # 2. Cable Routing (Dijkstra Shortest Path)
    for c in cables:
        eff_od = get_effective_cable_od(c, parameters)
        s_raw = c.source_node.strip()
        d_raw = c.dest_node.strip()
        s_node = canonical_nodes.get(s_raw.upper(), s_raw)
        d_node = canonical_nodes.get(d_raw.upper(), d_raw)

        src_missing = s_node not in all_graph_nodes
        dst_missing = d_node not in all_graph_nodes

        if src_missing:
            missing_nodes.add(s_node)
        if dst_missing:
            missing_nodes.add(d_node)

        if src_missing or dst_missing:
            unrouted_cables.append(c.cable_tag)
            missing_parts = []
            if src_missing:
                s_sugg = find_node_suggestion(s_node, all_graph_nodes, exclude=d_node)
                s_hint = f" (Did you mean '{s_sugg}'?)" if (s_sugg and s_sugg != s_node) else ""
                panel_hint = f" [Panel: {c.source_panel}]" if (c.source_panel and c.source_panel != s_node) else ""
                missing_parts.append(f"Source '{s_node}'{panel_hint}{s_hint}")
            if dst_missing:
                d_sugg = find_node_suggestion(d_node, all_graph_nodes, exclude=s_node)
                d_hint = f" (Did you mean '{d_sugg}'?)" if (d_sugg and d_sugg != d_node) else ""
                panel_hint = f" [Panel: {c.dest_panel}]" if (c.dest_panel and c.dest_panel != d_node) else ""
                missing_parts.append(f"Dest '{d_node}'{panel_hint}{d_hint}")
            reason = f"Endpoint missing in branch network: {', '.join(missing_parts)}"
            cable_routing_results.append(
                CableRoutingResult(
                    cable_tag=c.cable_tag,
                    source_node=s_node,
                    dest_node=d_node,
                    cable_type=c.cable_type,
                    od_mm=eff_od,
                    count=c.count,
                    status="UNROUTED",
                    unrouted_reason=reason,
                    source_panel=c.source_panel,
                    dest_panel=c.dest_panel,
                )
            )
            continue

        # If source and dest are the same node
        if s_node == d_node:
            # Check if an explicit self-loop branch exists (e.g. branch between P101 and P101)
            if s_node in self_loop_branches and len(self_loop_branches[s_node]) > 0:
                local_b = self_loop_branches[s_node][0]
                branch_routed_cables[local_b.branch_id].append(c)
                total_routed_cable_length += local_b.length_m * c.count
                cable_routing_results.append(
                    CableRoutingResult(
                        cable_tag=c.cable_tag,
                        source_node=s_node,
                        dest_node=d_node,
                        cable_type=c.cable_type,
                        od_mm=eff_od,
                        count=c.count,
                        status="ROUTED",
                        path_nodes=[s_node],
                        path_branches=[local_b.branch_id],
                        total_length_m=round(local_b.length_m, 2),
                        source_panel=c.source_panel,
                        dest_panel=c.dest_panel,
                    )
                )
            else:
                # Internal panel wiring (Source & Destination are identical)
                # Valid local connection; does not require external tray routing.
                cable_routing_results.append(
                    CableRoutingResult(
                        cable_tag=c.cable_tag,
                        source_node=s_node,
                        dest_node=d_node,
                        cable_type=c.cable_type,
                        od_mm=eff_od,
                        count=c.count,
                        status="LOCAL",
                        path_nodes=[s_node],
                        path_branches=[],
                        total_length_m=0.0,
                        unrouted_reason=f"Local panel wiring inside {s_node} (no external tray required)",
                        source_panel=c.source_panel,
                        dest_panel=c.dest_panel,
                    )
                )
            continue

        try:
            path_nodes = nx.shortest_path(G, source=s_node, target=d_node, weight="length_m")
            path_branches: List[str] = []
            cable_len = 0.0

            for i in range(len(path_nodes) - 1):
                u = path_nodes[i]
                v = path_nodes[i + 1]
                b_match = edge_to_branch.get((u, v))
                if b_match:
                    path_branches.append(b_match.branch_id)
                    cable_len += b_match.length_m
                    branch_routed_cables[b_match.branch_id].append(c)
                else:
                    edge_data = G.get_edge_data(u, v) or {}
                    b_id = edge_data.get("branch_id", f"{u}-{v}")
                    path_branches.append(b_id)
                    cable_len += edge_data.get("length_m", 1.0)
                    if b_id in branch_routed_cables:
                        branch_routed_cables[b_id].append(c)

            total_routed_cable_length += cable_len * c.count
            cable_routing_results.append(
                CableRoutingResult(
                    cable_tag=c.cable_tag,
                    source_node=s_node,
                    dest_node=d_node,
                    cable_type=c.cable_type,
                    od_mm=eff_od,
                    count=c.count,
                    status="ROUTED",
                    path_nodes=path_nodes,
                    path_branches=path_branches,
                    total_length_m=round(cable_len, 2),
                    source_panel=c.source_panel,
                    dest_panel=c.dest_panel,
                )
            )
        except nx.NetworkXNoPath:
            unrouted_cables.append(c.cable_tag)
            d_sugg = find_node_suggestion(d_node, all_graph_nodes, exclude=s_node)
            suggestion_text = f" (Did you mean '{d_sugg}'?)" if (d_sugg and d_sugg != d_node) else ""
            reason = f"No tray path exists between '{s_node}' and '{d_node}'.{suggestion_text}"
            cable_routing_results.append(
                CableRoutingResult(
                    cable_tag=c.cable_tag,
                    source_node=s_node,
                    dest_node=d_node,
                    cable_type=c.cable_type,
                    od_mm=eff_od,
                    count=c.count,
                    status="UNROUTED",
                    unrouted_reason=reason,
                    source_panel=c.source_panel,
                    dest_panel=c.dest_panel,
                )
            )
        except Exception as e:
            unrouted_cables.append(c.cable_tag)
            cable_routing_results.append(
                CableRoutingResult(
                    cable_tag=c.cable_tag,
                    source_node=s_node,
                    dest_node=d_node,
                    cable_type=c.cable_type,
                    od_mm=eff_od,
                    count=c.count,
                    status="UNROUTED",
                    unrouted_reason=str(e),
                    source_panel=c.source_panel,
                    dest_panel=c.dest_panel,
                )
            )

    # 3. Tray Sizing Calculation per Branch
    branch_results: List[BranchSizingResult] = []
    max_fill_pct = 0.0
    max_fill_branch_id: Optional[str] = None
    overfilled_count = 0
    total_tray_length = sum(b.length_m for b in branches)

    for b in branches:
        routed_c_list = branch_routed_cables.get(b.branch_id, [])
        tray_h = b.tray_height_mm if (b.tray_height_mm is not None and b.tray_height_mm > 0) else default_h
        if tray_h <= 0:
            tray_h = 60.0

        def get_category(c: Cable) -> str:
            if getattr(c, "category", None):
                cat_lower = str(c.category).strip().lower()
                if cat_lower in ["power", "control", "signal", "data", "bus"]:
                    return cat_lower
            s = c.cable_type.strip().lower()
            if any(k in s for k in ["pwr", "power", "feeder", "motor", "mv", "lv", "400v", "1kv", "volt"]):
                return "power"
            if any(k in s for k in ["data", "bus", "eth", "net", "cat", "fiber", "prof", "modbus", "fieldbus"]):
                return "data"
            if any(k in s for k in ["ctrl", "control", "24v", "sig", "signal", "sensor", "inst"]):
                return "control"
            import re
            m = re.search(r"(?:(\d+)\s*(?:c|core|cores)?\s*(?:[xX\*\/])\s*(\d+(?:\.\d+)?))", s, re.IGNORECASE)
            if m:
                try:
                    cores = int(m.group(1))
                    size = float(m.group(2))
                    if cores in (3, 4, 5) and size >= 6.0:
                        return "power"
                except (ValueError, TypeError):
                    pass
            return "control"

        pwr_cables = [c for c in routed_c_list if get_category(c) == "power"]
        ctrl_cables = [c for c in routed_c_list if get_category(c) == "control"]
        data_cables = [c for c in routed_c_list if get_category(c) == "data"]

        total_cable_items = sum(c.count for c in routed_c_list)
        pwr_count = sum(c.count for c in pwr_cables)
        ctrl_count = sum(c.count for c in ctrl_cables)
        data_count = sum(c.count for c in data_cables)

        # 3a. Power Cable Width (Trefoil, Flat Touching, or Flat Spaced for 1-core; 2x OD for multi-core)
        pwr_width_mm = 0.0
        branch_warnings: List[str] = []
        for c in pwr_cables:
            eff_od = get_effective_cable_od(c, parameters)
            w_c, c_form, b_h = calculate_power_cable_width(c, eff_od, parameters.single_core_power_formation)
            pwr_width_mm += w_c
            if c_form == "trefoil" and b_h > tray_h:
                branch_warnings.append(
                    f"Trefoil bundle height ({round(b_h, 1)} mm) for cable '{c.cable_tag}' exceeds tray height ({round(tray_h, 1)} mm)"
                )

        # 3b. Control & Data Cable Width (Multilayer Area vs Single Layer Flat Touching)
        ctrl_fill_fraction = max(parameters.control_fill_pct / 100.0, 0.05)
        ctrl_method = getattr(parameters, "control_cable_laying_method", "multi_layer") or "multi_layer"

        if ctrl_method == "single_layer":
            # Single Layer Flat (Touching): Width = sum(OD * count)
            ctrl_width_mm = sum(get_effective_cable_od(c, parameters) * c.count for c in ctrl_cables)
            data_width_mm = sum(get_effective_cable_od(c, parameters) * c.count for c in data_cables)
        else:
            # Multilayer Area: Area / (tray_height * (fill_pct / 100))
            ctrl_area_mm2 = sum((math.pi * (get_effective_cable_od(c, parameters)**2) / 4.0) * c.count for c in ctrl_cables)
            ctrl_width_mm = (ctrl_area_mm2 / (tray_h * ctrl_fill_fraction)) if ctrl_area_mm2 > 0 else 0.0

            data_area_mm2 = sum((math.pi * (get_effective_cable_od(c, parameters)**2) / 4.0) * c.count for c in data_cables)
            data_width_mm = (data_area_mm2 / (tray_h * ctrl_fill_fraction)) if data_area_mm2 > 0 else 0.0

        # 3d. Metallic Divider / Barrier
        barrier_width_mm = 0.0
        if parameters.add_metallic_divider:
            has_power = pwr_count > 0
            has_other = (ctrl_count + data_count) > 0
            if has_power and has_other:
                barrier_width_mm = parameters.divider_width_mm

        # 3e. Required Calculated Width with Spare Margin
        # Width_req = (Width_pwr + Width_ctrl + Width_data + Barrier) * (1 + Spare Margin)
        raw_width = pwr_width_mm + ctrl_width_mm + data_width_mm + barrier_width_mm
        spare_factor = 1.0 + (parameters.spare_margin_pct / 100.0)
        calculated_width = raw_width * spare_factor

        # 3f. Standard Commercial Selection
        cables_detail: List[CableRoutedDetail] = []
        for c in routed_c_list:
            c_cat = get_category(c)
            eff_od = get_effective_cable_od(c, parameters)
            if c_cat == "power":
                w_c, c_form, _ = calculate_power_cable_width(c, eff_od, parameters.single_core_power_formation)
                w_contrib = w_c * spare_factor
                c_form_val = c_form
            else:
                if ctrl_method == "single_layer":
                    w_contrib = eff_od * c.count * spare_factor
                    c_form_val = "flat_touching"
                else:
                    c_area = (math.pi * (eff_od**2) / 4.0) * c.count
                    w_contrib = (c_area / (tray_h * ctrl_fill_fraction)) * spare_factor
                    c_form_val = None
            cables_detail.append(
                CableRoutedDetail(
                    cable_tag=c.cable_tag,
                    source_node=c.source_node,
                    dest_node=c.dest_node,
                    cable_type=c.cable_type,
                    od_mm=eff_od,
                    count=c.count,
                    width_contribution_mm=round(w_contrib, 2),
                    formation=c_form_val,
                    source_panel=c.source_panel,
                    dest_panel=c.dest_panel,
                )
            )

        min_std_width = STANDARD_COMMERCIAL_WIDTHS[0]
        max_std_width = STANDARD_COMMERCIAL_WIDTHS[-1]

        if total_cable_items == 0:
            rec_width = min_std_width
            fill_pct = 0.0
            status = BranchStatus.EMPTY.value
        else:
            # Find next standard commercial width >= calculated_width
            matched_width = None
            for w in STANDARD_COMMERCIAL_WIDTHS:
                if w >= calculated_width:
                    matched_width = w
                    break

            if matched_width is not None:
                rec_width = matched_width
                status = BranchStatus.OK.value
                fill_pct = round((calculated_width / rec_width) * 100.0, 1)
            else:
                rec_width = max_std_width
                status = BranchStatus.OVERFILL_SPLIT_TIER.value
                fill_pct = round((calculated_width / float(max_std_width)) * 100.0, 1)
                overfilled_count += 1

        if fill_pct > max_fill_pct and total_cable_items > 0:
            max_fill_pct = fill_pct
            max_fill_branch_id = b.branch_id

        # Unique routed cable tags preserving order
        unique_cables_routed = list(dict.fromkeys(c.cable_tag for c in routed_c_list))

        branch_results.append(
            BranchSizingResult(
                branch_id=b.branch_id,
                node_from=b.node_from,
                node_to=b.node_to,
                level=b.level,
                branch_type=b.branch_type,
                length_m=round(b.length_m, 2),
                tray_height_mm=round(tray_h, 1),
                cable_count=total_cable_items,
                power_cables_count=pwr_count,
                control_cables_count=ctrl_count,
                data_cables_count=data_count,
                power_width_mm=round(pwr_width_mm, 2),
                control_width_mm=round(ctrl_width_mm, 2),
                data_width_mm=round(data_width_mm, 2),
                barrier_width_mm=round(barrier_width_mm, 2),
                calculated_width_mm=round(calculated_width, 1),
                recommended_commercial_width_mm=rec_width,
                fill_ratio_pct=round(fill_pct, 1),
                cables_routed=unique_cables_routed,
                cables_detail=cables_detail,
                status=status,
                warnings=branch_warnings,
            )
        )

    # 4. Diagnostics: Disconnected nodes
    disconnected_nodes: List[str] = []
    if G.number_of_nodes() > 0:
        deg_0 = [n for n, d in G.degree() if d == 0]
        disconnected_nodes.extend(deg_0)
        components = list(nx.connected_components(G))
        if len(components) > 1:
            components.sort(key=len, reverse=True)
            for comp in components[1:]:
                for n in comp:
                    if n not in disconnected_nodes:
                        disconnected_nodes.append(n)

    total_routed_count = len(cables) - len(unrouted_cables)

    summary = CalculationSummary(
        total_cables_routed=total_routed_count,
        unrouted_cables=unrouted_cables,
        total_branches=len(branches),
        max_fill_branch_id=max_fill_branch_id,
        max_fill_pct=round(max_fill_pct, 1),
        total_cable_length_routed_m=round(total_routed_cable_length, 2),
        total_tray_length_m=round(total_tray_length, 2),
        overfilled_branches_count=overfilled_count,
    )

    diagnostics = Diagnostics(
        disconnected_nodes=sorted(list(set(disconnected_nodes))),
        missing_nodes_referenced_in_cables=sorted(list(missing_nodes)),
        unrouted_cables_details=[c for c in cable_routing_results if c.status == "UNROUTED"],
    )

    calculated_nodes = calculate_network_node_fittings(
        branches=branches,
        branch_results=branch_results,
        user_configs=node_fittings,
        default_tray_height_mm=default_h,
    )

    bom = generate_bill_of_materials(parameters, branch_results, cable_routing_results, calculated_nodes)

    return CalculationResponse(
        summary=summary,
        branches=branch_results,
        cables=cable_routing_results,
        diagnostics=diagnostics,
        bom=bom,
        nodes=calculated_nodes,
    )


def generate_bill_of_materials(
    parameters: CalculationParameters,
    branches: List[BranchSizingResult],
    cables: List[CableRoutingResult],
    node_fittings: Optional[List[CalculatedNodeFitting]] = None,
) -> BillOfMaterials:
    """Generate industrial Bill of Materials (BOM) & Material Take-Off."""
    # 1. Trays aggregated by (recommended_commercial_width_mm, tray_height_mm, branch_type)
    tray_groups: Dict[tuple, Dict[str, Any]] = {}
    total_tray_len = 0.0
    total_sections = 0

    for b in branches:
        key = (b.recommended_commercial_width_mm, b.tray_height_mm, b.branch_type)
        if key not in tray_groups:
            tray_groups[key] = {
                "width_mm": b.recommended_commercial_width_mm,
                "height_mm": b.tray_height_mm,
                "branch_type": b.branch_type,
                "total_length_m": 0.0,
                "branch_count": 0,
            }
        tray_groups[key]["total_length_m"] += b.length_m
        tray_groups[key]["branch_count"] += 1
        total_tray_len += b.length_m

    tray_items: List[TrayBomItem] = []
    for key, data in sorted(tray_groups.items(), key=lambda x: (x[0][0], x[0][1], x[0][2])):
        sec_count = math.ceil(data["total_length_m"] / 3.0) if data["total_length_m"] > 0 else 0
        total_sections += sec_count
        tray_items.append(
            TrayBomItem(
                width_mm=data["width_mm"],
                height_mm=data["height_mm"],
                branch_type=data["branch_type"],
                total_length_m=round(data["total_length_m"], 2),
                section_count_3m=sec_count,
                branch_count=data["branch_count"],
            )
        )

    # 2. Accessories & Hardware
    # - Joint couplers: 2 plates per connection joint
    # - Joint hardware bolts: 4 bolts per coupler plate (8 bolts per joint)
    # - Support brackets: spaced at 1.5m intervals along tray runs
    total_joints = sum(max(0, math.ceil(b.length_m / 3.0) - 1) for b in branches)
    total_connection_joints = max(len(branches), total_joints + len(branches)) if branches else 0
    coupler_qty = total_connection_joints * 2
    hardware_bolts_qty = coupler_qty * 4
    support_qty = sum(max(1, math.ceil(b.length_m / 1.5)) for b in branches) if branches else 0

    accessories: List[AccessoryBomItem] = [
        AccessoryBomItem(
            item_name="Straight Splice Coupler Plates",
            category="Coupler",
            description="Galvanized steel side-rail coupler plates (2 per standard 3m joint/connection)",
            quantity=coupler_qty,
            unit="pcs",
        ),
        AccessoryBomItem(
            item_name="Joint Hardware Sets (M8x20 Bolts & Flange Nuts)",
            category="Hardware",
            description="High-tensile zinc-plated fasteners for coupler plates (4 bolts per plate)",
            quantity=hardware_bolts_qty,
            unit="sets",
        ),
        AccessoryBomItem(
            item_name="Trapeze Hanger Supports / Cantilever Brackets",
            category="Support",
            description="Structural heavy-duty ceiling/wall support assemblies spaced @ 1.5m intervals",
            quantity=support_qty,
            unit="pcs",
        ),
    ]

    if parameters.add_metallic_divider and branches:
        divider_len = sum(
            b.length_m for b in branches
            if b.power_cables_count > 0 and (b.control_cables_count + b.data_cables_count) > 0
        )
        if divider_len > 0:
            divider_pcs = math.ceil(divider_len / 3.0)
            accessories.append(
                AccessoryBomItem(
                    item_name=f"Perforated Metallic Barrier Divider ({parameters.divider_width_mm}mm)",
                    category="Divider",
                    description="Continuous EMI metallic segregation strip (3.0m sections) for separating power & control",
                    quantity=divider_pcs,
                    unit="pcs (3m)",
                )
            )

    # 3. Cable Length Summary
    cable_groups: Dict[str, Dict[str, Any]] = {}
    total_cable_len = 0.0

    for c in cables:
        if c.status != "ROUTED":
            continue
        c_type = c.cable_type.strip()
        if c_type not in cable_groups:
            cable_groups[c_type] = {
                "cable_type": c_type,
                "cable_count": 0,
                "total_routed_length_m": 0.0,
            }
        run_len = c.total_length_m * c.count
        cable_groups[c_type]["cable_count"] += c.count
        cable_groups[c_type]["total_routed_length_m"] += run_len
        total_cable_len += run_len

    cables_summary: List[CableBomItem] = []
    for c_type, c_data in sorted(cable_groups.items(), key=lambda x: x[0]):
        cnt = c_data["cable_count"]
        tot = c_data["total_routed_length_m"]
        avg = round(tot / cnt, 2) if cnt > 0 else 0.0
        cables_summary.append(
            CableBomItem(
                cable_type=c_type,
                cable_count=cnt,
                total_routed_length_m=round(tot, 2),
                avg_length_m=avg,
            )
        )

    # 4. Fittings & Reducers
    fitting_groups: Dict[tuple, Dict[str, Any]] = {}
    reducer_groups: Dict[tuple, Dict[str, Any]] = {}

    if node_fittings:
        for node in node_fittings:
            if node.selected_fitting_type != "none":
                f_type = node.selected_fitting_type
                f_key = (f_type, node.width_mm, node.height_mm)
                f_name = FITTING_TYPE_NAMES.get(f_type, f_type)
                if f_key not in fitting_groups:
                    fitting_groups[f_key] = {
                        "fitting_type": f_type,
                        "fitting_name": f_name,
                        "width_mm": node.width_mm,
                        "height_mm": node.height_mm,
                        "quantity": 0,
                        "nodes": [],
                    }
                fitting_groups[f_key]["quantity"] += 1
                fitting_groups[f_key]["nodes"].append(node.node_id)

            for r in node.reducers.values():
                if r.enabled and r.from_width_mm > r.to_width_mm:
                    r_key = (r.from_width_mm, r.to_width_mm, r.height_mm, r.reducer_type)
                    if r_key not in reducer_groups:
                        reducer_groups[r_key] = {
                            "from_width_mm": r.from_width_mm,
                            "to_width_mm": r.to_width_mm,
                            "height_mm": r.height_mm,
                            "reducer_type": r.reducer_type,
                            "quantity": 0,
                            "locations": [],
                        }
                    reducer_groups[r_key]["quantity"] += 1
                    reducer_groups[r_key]["locations"].append({"node_id": node.node_id, "branch_id": r.branch_id})

    fittings: List[FittingBomItem] = [
        FittingBomItem(**data)
        for _, data in sorted(fitting_groups.items(), key=lambda x: (-x[0][1], x[0][0]))
    ]
    reducers: List[ReducerBomItem] = [
        ReducerBomItem(**data)
        for _, data in sorted(reducer_groups.items(), key=lambda x: (-x[0][0], -x[0][1]))
    ]

    return BillOfMaterials(
        trays=tray_items,
        accessories=accessories,
        cables_summary=cables_summary,
        fittings=fittings,
        reducers=reducers,
        total_tray_length_m=round(total_tray_len, 2),
        total_sections_3m=total_sections,
        total_cable_length_m=round(total_cable_len, 2),
        total_fittings_count=sum(f.quantity for f in fittings),
        total_reducers_count=sum(r.quantity for r in reducers),
    )

