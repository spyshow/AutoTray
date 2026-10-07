# PLAN: Include Routed Cables in Selected Branch Inspection Drawer

## 1. Goal
When a cable tray segment is selected in the Network Graph / Mind Map view, display a detailed, interactive **Routed Cables Table** inside the inspection drawer at the bottom:
- Show all individual cables traversing the selected segment:
  - **Cable Tag** (e.g. `CBL_001`)
  - **Spec / Type** (e.g. `4x50 mm²`)
  - **Outer Diameter (OD)** (e.g. `24.5 mm`)
  - **Quantity** (e.g. `1`)
  - **Routing Span** (Source Node ➔ Destination Node)
  - **Width Contribution** (calculated mm footprint on tray)
  - **Equipment / Panel info** (Source Panel ➔ Dest Panel, if mapped)
- Provide a quick toggle (`Show/Hide Cables`) or collapsible table with an instant filter search input.

---

## 2. Implementation Steps

### Step 1: Update `NetworkGraphView` (`frontend/src/components/network-graph-view.tsx`)
- **Extract Routed Cables Data**:
  - Read `selectedResult.cables_detail` (which contains full metadata including `od_mm`, `cable_type`, `width_contribution_mm`, `source_panel`, `dest_panel`).
  - Fall back to matching `selectedResult.cables_routed` against the `cables: Cable[]` prop if `cables_detail` is absent.
- **Render Interactive Cables Section**:
  - Below the segment KPIs (`Cables Routed`, `Calculated Width`, `Commercial Tray`, `Fill Ratio`), render an expandable panel.
  - Include an inline search input to filter cables by tag or type when many cables traverse the branch.
  - Compact, high-density table with badges, monospace tags, and clear column headers.
  - Show empty state ("No cables routed through this segment") if `cable_count === 0`.

### Step 2: Verification
- **Automated Tests**:
  - In `frontend/src/tests/branches.test.mjs`, add tests verifying:
    1. Routed cables extraction correctly resolves full cable details from `BranchSizingResult` and fallback `Cable[]`.
    2. Cable search filtering properly filters rows by tag and type.
- **Run Frontend Tests**: `npm test` in `frontend`.
- **Run Backend Tests**: `pytest` in `backend`.
- **Run Build**: `npm run build` in `frontend`.
