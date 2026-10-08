# PLAN: Compact Cable Schedule Width to Fit Screen

## 1. Problem Diagnosis
- In `cables-table.tsx`, the 11 columns are inflated with oversized minimum widths (`min-w-[170px]`, `min-w-[175px]`, `min-w-[160px]`), wide inputs (`NodeComboboxCell` set to `w-36`), wide header subtitles, and `px-3` (24px/column) default cell padding.
- This balloons the total table width past 1,400px, causing columns 8–11 (Parallel Runs, Route Status, Actions) to be pushed far off the right side of the screen and requiring tedious horizontal scrolling.

---

## 2. Implementation Steps

### Step 1: Tighten Cable Schedule Column Widths & Components [COMPLETED]
- In `frontend/src/components/cables-table.tsx`:
  - **Select Checkbox**: `w-9 text-center px-1` (~36px).
  - **Cable Tag**: Compacted to `min-w-[125px] max-w-[140px]` with `w-24` tag input.
  - **Source Node**: Compacted to `min-w-[115px] max-w-[130px]` with `widthClass="w-28"` and header `Source (From)`.
  - **Destination Node**: Compacted to `min-w-[115px] max-w-[130px]` with `widthClass="w-28"` and header `Destination (To)`.
  - **Cable Spec / Type**: Compacted to `min-w-[105px] max-w-[120px]` with header `Spec / Type` and `w-20` input.
  - **Category**: Compacted to `min-w-[75px] max-w-[85px]` with compact `text-[11px]` select styling.
  - **Formation**: Compacted to `min-w-[85px] max-w-[95px]` with concise header `Formation`.
  - **OD (mm)**: Compacted to `min-w-[60px] max-w-[70px]` with `w-14` numeric input and header `OD (mm)`.
  - **Parallel Runs**: Compacted to `min-w-[55px] max-w-[65px]` with concise header `Runs / Qty` and `w-12` numeric input.
  - **Route Status**: Compacted to `min-w-[100px] max-w-[115px]` with concise header `Route`.
  - **Actions**: `w-8 flex justify-center` (~32px).

### Step 2: Reduce Horizontal Cell Padding [COMPLETED]
- In `cables-table.tsx`, updated `TableHead` to `py-2 px-2` and `TableCell` to `py-1.5 px-2`, eliminating unnecessary empty padding across all 11 columns.

### Step 3: Verify and Test [COMPLETED]
- Total table width trimmed from ~1,400px+ down to ~904px, fitting all 11 columns on screen without side-scrolling.
- Ran `npm test` in `frontend` (107/107 tests passing).
- Ran `pytest` in `backend` (46/46 tests passing).
- Ran `npm run build` in `frontend` (0 errors, Turbopack production build succeeded).
