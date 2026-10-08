# PLAN: Expandable Cable Route Path Under Row via '+' Button

## 1. Goal
In the **Cables Schedule** table (`CablesTable`), add an interactive `+` / `−` toggle button next to each **Cable Tag**. When clicked, it expands a detailed card directly beneath the table row displaying the complete cable route from **Source Node** to **Destination Node**. This includes the sequence of intermediate nodes, tray branch segments, elevation levels, total routed length, and diagnostic warnings if the cable is unrouted.

---

## 2. Technical Architecture & Analysis
1. **Row Expansion State**:
   - In `CablesTable`, track `expandedRowIds: Set<string>` in component state.
   - A toggle handler switches the row ID in/out of the set.
2. **`+` / `−` Sign Toggle in Cable Tag Column**:
   - In the `cable_tag` column cell, place a small, high-affordance `Button` with a `+` (collapsed) or `−` (expanded) icon immediately to the left or right of the tag input.
   - Styled cleanly so it does not interfere with the tag editing or sorting.
3. **Expandable Route Container (`<TableRow>` & `<div>`)**:
   - Render a sub-row `<TableRow className="bg-slate-50/80 ...">` spanning all columns (`colSpan={columns.length}`).
   - Look up the cable's `CableRoutingResult` using the composite key / index matcher.
   - If `status === 'ROUTED'`:
     - Visual flow path: `[Source Node]` ➔ `(Segment BR_01)` ➔ `[Node]` ➔ `(Segment BR_02)` ➔ ... ➔ `[Destination Node]`.
     - Route summary cards: Total length (m), Traversed tray segments count, Elevation levels visited.
   - If `status === 'LOCAL'`:
     - Badge & message: "Internal connection within node [X] (0 m length)".
   - If `status === 'UNROUTED'`:
     - Diagnostic banner explaining why the route failed (e.g. disconnected components, missing bridge riser, or unknown endpoint).
   - If uncalculated:
     - Friendly helper prompting the user to run the network calculation.

---

## 3. Implementation Steps

### Step 1: Add Expansion State & `+` Toggle Button in `cables-table.tsx` - COMPLETED
- Added `expandedRowIds` Set state and `toggleRowExpansion` handler.
- Integrated `+` / `−` icon button inside the `cable_tag` column cell.
- Added `expandedRowIds` to `columns` memoization dependencies so button toggles immediately.

### Step 2: Implement Detailed Cable Route View Under Row - COMPLETED
- Implemented `CableRouteExpandedView` displaying:
  - Source-to-destination node breadcrumbs with badges.
  - Intermediate junction nodes and connecting branch segments.
  - Traversed tray segments breakdown cards with lengths and levels.
  - Diagnostic warnings for unrouted or local cables.
- Rendered sub-row `<TableRow>` spanning all columns when `isExpanded` is true.

### Step 3: Verification & Automated Tests - COMPLETED
- `npm test` in `frontend`: 103/103 tests passed.
- `pytest` in `backend`: 45/45 tests passed.
- `npm run build` in `frontend`: Next.js Turbopack production build succeeded with 0 errors.

