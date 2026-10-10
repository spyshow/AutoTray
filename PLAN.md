# PLAN: Fix Table Headers Disappearing on Scroll

## 1. Problem Diagnosis
- When users scroll down long tables (Cables, Branches, Results, Nodes, Catalog), the table column headers disappear out of view because `TableHead` was non-sticky.
- Previously, an attempt to make `TableHead` sticky used `top: ${headerOffset + toolbarHeight}px` inside a container with `overflow-auto`. In CSS, any element with `overflow` creates an isolated scroll container where `top: 113px` immediately displaces the header down 113px over the first 2-3 data rows even when the page is at scroll position 0.
- Conversely, on desktop viewports (where the tables are compacted to ~904px and easily fit within standard desktop widths), setting `overflow-visible` allows the sticky viewport to be the browser window. The header then stays in natural document flow at scroll 0, and cleanly pins at `top: ${headerOffset + toolbarHeight}px` right underneath the sticky toolbar when scrolling down.
- On mobile/small screens (< 1024px), horizontal swiping is preserved via `overflow-x-auto`, while keeping headers in natural static flow so they never overlay data rows.

---

## 2. Implementation Steps

### Step 1: Add Dynamic Measurement & Desktop Sticky State to Tables [COMPLETED]
- In `frontend/src/components/ui/table.tsx`:
  - Updated `Table` container to use `containerClassName || "overflow-auto"`, enabling callers to set `overflow-visible` on desktop.
- In `frontend/src/components/cables-table.tsx`:
  - Measured `toolbarRef` height dynamically via `ResizeObserver` (`toolbarHeight`).
  - Tracked `isDesktop` via `window.matchMedia('(min-width: 1024px)')`.
  - Updated `Table containerClassName={isDesktop ? "overflow-visible min-w-full" : "overflow-x-auto min-w-full"}`.
  - Applied responsive sticky to `TableHead`:
    - `style={isDesktop ? { top: `${headerOffset + toolbarHeight}px` } : undefined}`
    - `className={cn("bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 py-2 px-2 whitespace-nowrap", isDesktop && "sticky z-10 shadow-xs")}`

### Step 2: Apply Responsive Sticky to Branches, Results, Nodes, and Catalog Tables [COMPLETED]
- In `frontend/src/components/branches-table.tsx`:
  - Attached `toolbarRef`, dynamic `toolbarHeight`, `isDesktop`, and applied responsive sticky to `TableHead`.
- In `frontend/src/components/results-table.tsx`:
  - Attached `toolbarRef`, dynamic `toolbarHeight`, `isDesktop`, and applied responsive sticky to `TableHead`.
- In `frontend/src/components/nodes-fittings-tab.tsx`:
  - Attached `toolbarRef`, dynamic `toolbarHeight`, `isDesktop`, and applied responsive sticky to `th` headers.
- In `frontend/src/components/defaults-settings-tab.tsx`:
  - Attached `toolbarRef`, dynamic `toolbarHeight`, `isDesktop`, and applied responsive sticky to catalog `th` headers.

### Step 3: Run Full Test Suites & Production Build [COMPLETED]
- Ran `npm test` in `frontend` (107/107 tests passed).
- Ran `.venv\Scripts\python -m pytest` in `backend` (46/46 tests passed).
- Ran `npm run build` in `frontend` (Compiled successfully, 0 errors).
