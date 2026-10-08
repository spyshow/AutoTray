# PLAN: Background Contrast, All Tables Zebra Striping, and Cable Table Layout Fixes

## 1. Problem Diagnosis
1. **Background Contrast**: The page root background in `page.tsx` is `bg-slate-100/60`, which is nearly identical to pure white (`#f8fafc` vs `#ffffff`). White cards and table containers blend into the background with little separation.
2. **Cable Table Layout**:
   - "Parallel Runs" header wraps into 4 awkward vertical lines (`Parallel / Runs / Qty (Default: / 1)`) and spills over the bottom border of `<th>`.
   - Numeric columns ("OD (mm)" and "Parallel Runs") have right-aligned headers, but the cell inputs sit left-aligned in their cells, making numbers (`5.6`, `1`) look detached and misaligned from their column headers.
   - Columns lack defined min-widths, causing uneven spacing, squished headers, and truncated route status text.
3. **Zebra Lines**: Tables across the application currently have plain white rows, making it harder to track wide data rows across 10+ columns.

---

## 2. Implementation Steps

### Step 1: Darken Base Background for Contrast [COMPLETED]
- In `frontend/src/app/page.tsx` and `frontend/src/app/layout.tsx`, updated root container and body background to `bg-slate-200/60` so white cards (`bg-white`), borders (`border-slate-200`), and shadows pop with distinct contrast.
- Sticky toolbar backgrounds (`bg-white/95`) and table headers remain crisp.
- **Proof it works**: Clear visual contrast verified between page canvas and white card surfaces.

### Step 2: Cable Table Header & Column Alignment Overhaul [COMPLETED]
- In `frontend/src/components/cables-table.tsx`:
  - Formatted "Parallel Runs" header cleanly with `whitespace-nowrap min-w-[100px]` and right alignment; subtitle "Qty (Def: 1)" never wraps into 4 lines.
  - Wrapped "OD (mm)" input in `flex justify-end pr-1` so values align directly under right-aligned "OD (mm)".
  - Wrapped "Parallel Runs" input in `flex justify-end pr-1` so count values align directly under right-aligned "Parallel Runs".
  - Established explicit, proportional column min-widths across all 11 columns with `overflow-x-auto min-w-full`.
- **Proof it works**: Headers never wrap into 4 lines; numeric values sit flush beneath headers; columns maintain stable widths.

### Step 3: Implement Zebra Striping Across All Tables [COMPLETED]
- **Cables Table** (`cables-table.tsx`): Alternate data rows (`originalIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'`) while preserving selection and expanded row styles.
- **Branches Table** (`branches-table.tsx`): Alternate data rows (`originalIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'`).
- **Sizing Results Dashboard** (`results-table.tsx`): Alternate data rows and inner routed cables detail sub-table rows with stable zebra striping.
- **Bill of Materials** (`bom-tab.tsx`): Added zebra striping (`idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'`) to all 5 BOM tables (Trays, Fittings, Reducers, Accessories, and Cable Lengths).
- **Nodes & Fittings** (`nodes-fittings-tab.tsx`): Added zebra striping to fitting schedule rows.
- **Modals & Secondary Tables** (`missing-spec-od-modal.tsx`, `defaults-settings-tab.tsx`, `mapping-modal.tsx`, `network-graph-view.tsx`): Added zebra striping to all respective tables.
- **Proof it works**: Alternating rows visible across all 17 tables in the application; expanding rows preserves alternating background colors.

### Step 4: Verification & Automated Tests [COMPLETED]
- Run `npm test` in `frontend` (107/107 tests passing).
- Run `pytest` in `backend` (46/46 tests passing).
- Run `npm run build` in `frontend` (0 errors, Turbopack and TypeScript build succeeded).
