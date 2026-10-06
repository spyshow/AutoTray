# PLAN: Match Default Support Setting When Adding New Branches

## 1. Goal
When the user configures **Default Support** in the Settings tab (e.g., toggled to **Wall Cantilever** `wall_cantilever`), adding a new branch via:
1. The **"+ Add Branch / Riser"** button in `BranchesTable`,
2. The **"Add Branch Manually"** button in `EmptyProjectState`, or
3. Direct `handleAddBranch` calls
must automatically inherit the project's configured `default_mounting_type` rather than defaulting to hardcoded `ceiling_trapeze`.

---

## 2. Root Cause Analysis
1. In `BranchesTable` ([branches-table.tsx](file:///d:/BackUp/programing_projects/CT%20cal/frontend/src/components/branches-table.tsx)):
   - `BranchesTableProps` only receives `defaultTrayHeight`, but not `defaultMountingType`.
   - `handleAddNew()` creates a new branch without a `mounting_type` field.
   - The table column cell checks `row.original.mounting_type === 'wall_cantilever'`. Since `mounting_type` is undefined, it evaluated to false and rendered `"Ceiling Trapeze"`.
2. In `AutoTrayRouterPage` ([page.tsx](file:///d:/BackUp/programing_projects/CT%20cal/frontend/src/app/page.tsx)):
   - `<BranchesTable ... />` was not passed `defaultMountingType`.
   - `handleAddBranch` and `onAddBranchManually` did not set fallback to `parameters.default_mounting_type`.

---

## 3. Implementation Steps

### Step 1: Update `BranchesTable`
- Files: `frontend/src/components/branches-table.tsx`
- Add `defaultMountingType?: SupportMountingType` to `BranchesTableProps`.
- Store in `defaultMountingTypeRef`.
- In `handleAddNew()`, set `mounting_type: defaultMountingTypeRef.current || 'ceiling_trapeze'`.
- In table cell renderer for `mounting_type`, determine `effectiveMounting = row.original.mounting_type || defaultMountingTypeRef.current || 'ceiling_trapeze'`.
- Add `defaultMountingType` to `columns` dependency array so the display dynamically reflects setting changes for unassigned segments.

### Step 2: Update `page.tsx` Handlers & Component Props
- Files: `frontend/src/app/page.tsx`
- Pass `defaultMountingType={parameters.default_mounting_type || 'ceiling_trapeze'}` to `<BranchesTable />`.
- Update `handleAddBranch(branch)` to ensure `mounting_type: branch.mounting_type || parameters.default_mounting_type || 'ceiling_trapeze'`.
- Update `onAddBranchManually` in `EmptyProjectState` to use `parameters.default_mounting_type || 'ceiling_trapeze'`.

### Step 3: Excel Import Default Mounting
- Files: `frontend/src/lib/excel.ts`, `frontend/src/components/mapping-modal.tsx`
- In `mapRawDataToBranches`, default missing mounting columns to `defaultMountingType || 'ceiling_trapeze'`.
- In `mapping-modal.tsx`, pass `parameters?.default_mounting_type || 'ceiling_trapeze'`.

### Step 4: Verification
- [x] Implemented in `BranchesTable`, `page.tsx`, `excel.ts`, `mapping-modal.tsx`, and `seed.py`.
- [x] Added automated unit tests in `frontend/src/tests/excel.test.mjs` verifying default mounting type inheritance and explicit column overrides.
- [x] Ran `npm test` in frontend: 81/81 passed.
- [x] Ran `pytest` in backend: 45/45 passed.
- [x] Ran `npm run build` in frontend: Next.js production build succeeded with zero errors.
