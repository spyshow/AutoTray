# PLAN: Add Vertical Upward Skewed Tee (`vertical_upward_tee`)

## 1. Goal
Add **Vertical Upward Skewed Tee** (`vertical_upward_tee`) as a first-class industrial fitting type across the entire platform (frontend types, fitting catalog metadata, 2.5D SVG visualization, node fittings dropdown/selector, backend Pydantic models, and routing engine). This compliments the existing `vertical_downward_tee`, allowing multi-level networks to represent upward riser branches off a continuous horizontal cable tray run.

---

## 2. Implementation Steps

### Step 1: Update Frontend Types & Engine
- In `frontend/src/lib/types.ts`:
  - Add `'vertical_upward_tee'` to the `FittingType` union.
- In `frontend/src/lib/fittings-engine.ts`:
  - Add `vertical_upward_tee: 'Vertical Upward Skewed Tee'` to `FITTING_TYPE_NAMES`.
- **Proof it works**: TypeScript typechecker validates without syntax or union errors.

### Step 2: Update Fitting Illustrations & Selector
- In `frontend/src/components/fitting-illustrations.tsx`:
  - Add `vertical_upward_tee` definition to `FITTING_METADATA` with:
    - `name: 'Vertical Upward Skewed Tee'`
    - `apvName: 'Vertical Upward Skewed Tee'`
    - `category: 'Horizontal Junction'`
    - `description: 'Horizontal continuous header with a vertical upward skewed branch riser chute.'`
    - `ports: 3`
    - `angle: '90° Up Riser'`
    - `hasCover: true`
    - `coverName: 'Vertical Upward Tee Cover'`
  - Add `case 'vertical_upward_tee':` in `FittingIllustration` switch:
    - 2.5D SVG illustration featuring a lower horizontal tray header (`y=58, height=24`, side ports at `(12, 70)` and `(88, 70)`) and an upward riser chute rising to `y=16` (`ellipse cx=50, cy=16, rx=8, ry=3` with green upward port dot at `cx=50, cy=16, r=2.5, fill="#10B981"`).
  - Add `<SelectItem value="vertical_upward_tee">` to `FittingTypeSelector` in the "Tees & Branches (Planar / Multi-Level)" group alongside `vertical_downward_tee`.
- In `frontend/src/components/nodes-fittings-tab.tsx`:
  - Add `<option value="vertical_upward_tee">Vertical Upward Tee</option>` to the fitting type filter dropdown.
- **Proof it works**: SVG renders cleanly at standard icon sizes, and dropdown displays the new fitting with its icon and label.

### Step 3: Update Backend Models & Routing Engine
- In `backend/app/models.py`:
  - Add `VERTICAL_UPWARD_TEE = "vertical_upward_tee"` to the `FittingType(str, Enum)` class.
- In `backend/app/routing_engine.py`:
  - Add `"vertical_upward_tee": "Vertical Upward Skewed Tee"` to `FITTING_TYPE_NAMES`.
- **Proof it works**: Python backend tests and enum serialization pass without error.

### Step 4: Verification & Automated Tests
- In `frontend/src/tests/fittings.test.mjs`:
  - Add `vertical_upward_tee` to test dictionary and add test assertions verifying:
    - `FITTING_TYPE_NAMES.vertical_upward_tee` resolves to `'Vertical Upward Skewed Tee'`.
    - BOM computation handles `vertical_upward_tee` including 3-port reducer calculations and cover BOM generation.
- In `backend/tests/`:
  - Verify routing engine tests pass with the new fitting type enum.
- Run test suites:
  - `npm test` in `frontend`
  - `.\.venv\Scripts\python -m pytest` in `backend`
  - `npm run build` in `frontend`
- **Proof it works**: All frontend and backend tests pass with 0 failures, and `npm run build` succeeds with no type errors.
