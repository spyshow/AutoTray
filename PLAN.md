# PLAN: Sticky Table Header with Filter Toolbar & Add Branch Button

## 1. Goal
When scrolling down through rows in the **Branches & Risers** table (and **Cables Schedule** table), the top action toolbar (search box, level/type filter pills, "Add Branch / Riser" button, and bulk delete actions) along with the table column headers (`Tray Segment ID`, `From Node`, `To Node`, etc.) must remain pinned (sticky) at the top of the viewport directly below the top application navigation bar. This ensures that users scrolling down long lists never lose access to filters, action buttons, or column identifiers.

---

## 2. Technical Architecture & Analysis
1. **Top Navbar Offset**:
   - The top navigation bar `<HeaderConfig>` is already `sticky top-0 z-30` with height ~57-61px.
   - We assign `id="app-header"` to `<HeaderConfig>` to dynamically observe its height via `ResizeObserver` or CSS variable `--app-header-height`.
2. **Integrated Sticky Toolbar**:
   - The action toolbar (search, level pills, orientation pills, Add Branch button) will be positioned sticky directly underneath `<HeaderConfig>` (`top: var(--app-header-height, 57px)`, `z-index: 20`).
   - Background has high-contrast solid white with subtle backdrop blur (`bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-xs`) so scrolling rows pass smoothly behind it.
3. **Sticky Column Headers (`TableHead`)**:
   - The table column headers (`<th>`) will be positioned sticky directly below the action toolbar (`top: calc(var(--app-header-height, 57px) + var(--table-toolbar-height, 56px))`, `z-index: 10`).
   - The toolbar height will be dynamically observed via `ResizeObserver` so responsive wrapping (e.g. pills wrapping to 2 lines) never overlaps or causes gaps.
   - Ensure ancestor containers in `BranchesTable` and `Table` do not clip vertical overflow (`overflow: visible` on vertical axis) to allow native, GPU-accelerated window scrolling, while keeping horizontal responsiveness intact.
4. **Consistency**:
   - Apply the matching sticky header & toolbar pattern to `CablesTable` (`src/components/cables-table.tsx`).

---

## 3. Implementation Steps

### Step 1: Update `HeaderConfig` with DOM Identifier & Observer
- In `frontend/src/components/header-config.tsx`:
  - Add `id="app-header"` to the root `<div className="... sticky top-0 z-30">`.
- **Proof it works**: Inspecting DOM or reading element returns the header node with correct `offsetHeight`.

### Step 2: Implement Sticky Toolbar & Table Header in `BranchesTable`
- In `frontend/src/components/branches-table.tsx`:
  - Add `ResizeObserver` hooks for `app-header` and `toolbarRef` to calculate `headerOffset` and `toolbarHeight`.
  - Style the action toolbar with `sticky top-[${headerOffset}px] z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-xs`.
  - Style the table card and `TableHeader` / `TableHead` so that each `TableHead` has `sticky top-[${headerOffset + toolbarHeight}px] z-10 bg-slate-100 border-b border-slate-200`.
  - Remove parent `overflow-hidden` from the card wrapper that blocks window sticky positioning.
- **Proof it works**: Scrolling down keeps the filter inputs, level buttons, Add Branch button, and column headers pinned at the top.

### Step 3: Implement Matching Sticky Pattern in `CablesTable`
- In `frontend/src/components/cables-table.tsx`:
  - Add matching dynamic sticky offsets for the cable toolbar (Search, Type filters, "Add Cable" button) and cable column headers.
- **Proof it works**: Scrolling down the Cables table keeps the search, filters, "Add Cable" button, and column headers pinned.

### Step 4: Verification & Automated Tests
- In `frontend/src/tests/`:
  - Run existing test suites `npm test`.
  - Run `npm run build` to verify Next.js compiles without type or lint errors.
- **Proof it works**: All 101 unit tests pass and build succeeds cleanly.
