# PLAN: Method 2 (Grouping Field Devices by Physical Drop Point) & Missing Spec OD Modal

## 1. Goal & Requirements
1. **Method 2 (IEC 81346 Node Normalization by Physical Drop Point)**:
   - In industrial EPLAN/IEC 81346 schedules (like the user's provided sheet):
     - **Internal cabinet modules (`+M-`, `+F-`, `+BCD-`, `+T1-`)**: Collapse to the parent panel node (`P181`, `P101`, `GEN`, `LVD`). Avoids creating hundreds of duplicate internal nodes.
     - **Field equipment (`+E-`, `+CBE-`)**: Group by the physical drop point/machine area (e.g., `=P181+E-7E1-7X1` and `=P181+E-7E1-9X1` group cleanly to **`E-7E1`**; `=P101+E-46E1-RX2` groups to **`E-46E1`** [OIL station]).
   - Provide an automated toggle in the Excel Import Modal: **"Group IEC 81346 Nodes by Physical Drop Point (Method 2)"**.

2. **Missing Cable Spec OD Modal**:
   - In the user's sheet, specs like `18G 0.75 mm²`, `12G 1.5 mm²`, `4x2 0.56 mm²` (CAT5e/7), and `5G 10 mm²` appear.
   - If any spec is not found in the custom rules (`custom_od_by_type`) or technical catalog (`lookupCatalogCableOd`), display an interactive modal:
     - Prompts for the Outer Diameter (OD in mm).
     - Saves the value permanently into project rules.
     - Updates all matching cables in the schedule.
     - Recalculates tray sizing immediately.

---

## 2. Implementation Steps

### Step 1: Implement IEC 81346 Smart Node Extractor (Method 2)
- **Files**: `frontend/src/lib/excel.ts`
- **Logic**:
  - Add helper function `normalizeIecNode(rawVal: string, panelVal: string, groupByDropPoint: boolean = true): string`:
    - If `rawVal` contains `+M-`, `+F-`, `+BCD-`, `+T1-` $\rightarrow$ return `panelVal.trim()` or extracted panel prefix (e.g. `P181`).
    - If `rawVal` contains `+E-` or `+CBE-`:
      - Extract equipment tag (e.g., from `=P181+E-7E1-7X1`, extract `E-7E1` if grouping by drop point, or `E-7E1-7X1` if exact).
    - If no IEC pattern $\rightarrow$ return `rawVal.trim()`.
  - Add `groupByDropPoint?: boolean` option to `mapRawDataToCables`.
- **Proof**: Unit tests with rows from the user's CSV verifying:
  - Row 52: `=P181+M-EX3` (Panel `P181`) $\rightarrow$ `P181`.
  - Row 53: `=P181+M-EX2` (Panel `P181`) $\rightarrow$ `P181`.
  - Row 168: `=P181+E-7E1-7X1` (Panel `P181`) $\rightarrow$ `E-7E1`.
  - Row 169: `=P181+E-7E1-9X1` (Panel `P181`) $\rightarrow$ `E-7E1`.

### Step 2: Add Option in Excel Mapping Modal
- **Files**: `frontend/src/components/mapping-modal.tsx`
- **Logic**:
  - Auto-detect IEC 81346 format if headers contain `Source (FROM)` / `Destination (TO)` with `=` and `+`.
  - Display a toggle checkbox:
    `[x] Smart IEC 81346 Node Normalization (Method 2: Collapse +M- to Panel, Group +E- by Equipment Drop Point)`.
  - Pass the option to `mapRawDataToCables`.
- **Proof**: User can import their raw EPLAN CSV directly and see clean, deduplicated nodes (`P101`, `P181`, `E-7E1`, `E-46E1`).

### Step 3: Implement `MissingSpecOdModal` Component
- **Files**: `frontend/src/components/missing-spec-od-modal.tsx`, `frontend/src/app/page.tsx`, `frontend/src/components/cables-table.tsx`
- **Logic**:
  - Modal lists all unique cable specs that lack an entry in rules/catalog.
  - Allows the user to enter OD (mm) and confirm category.
  - "Save to Rules & Apply" adds to `parameters.custom_od_by_type` and updates cables.
  - In `cables-table.tsx`: display alert badge when missing specs exist, plus `+ Set OD` chip on rows.
  - In `mapping-modal.tsx`: opens the modal right after import if any cable spec lacks an OD in the rules.
- **Proof**: Unit test verifying custom rules addition, and manual UI flow test.

### Step 4: Verification & Automated Tests
- Run `npm test` in `frontend/`:
  - 50/50 unit tests passing (covering fuzzy mapping, IEC normalization, multi-pair parsing, comma decimal parsing, OD hierarchy, missing spec rules).
- Run `npm run build` in `frontend/`:
  - Clean production build with 0 TypeScript/Turbopack errors.
- Run `pytest tests` in `backend/`:
  - 31/31 backend tests passing.

---

## 4. New Task: Fix `2Xx1.5` and `4Gx1.5` Designation Normalization
### Problem Diagnosis
In industrial EPLAN and European cable lists:
- `G` denotes conductors *with* ground/earth (PE) (e.g. `4G 1.5`, `5G 1.5`, `7G 1.5`, `12G 1.5`).
- `X` denotes conductors *without* ground/earth (e.g. `2X 1.5`, `4X 1.5`, `7X 1.5`).
- When exported or entered, the conductor type (`2X`, `4G`, `4X`) is combined with the multiplication character (`x`), producing designations like `2Xx1.5`, `2Xx0.5`, `4Gx1.5`, `4Xx1.5`, `5Gx1.5`, `7Gx1.5`, `7Xx1.5`, `12Gx1.5`.
- The previous core-size regex expected only a single letter (`[xX*×Gg]`), so:
  1. It failed to match `2Xx1.5` or `4Gx1.5` because of the two consecutive letters (`Xx` or `Gx`).
  2. The raw designation was not normalized into `2x1.5 mm²` or `4x1.5 mm²`.
  3. `lookupCatalogCableOd` could not match `2Xx1,5 mm²` or `4Gx1,5 mm²`, causing them to show up in the Missing Spec modal even though `2x1.5` (OD 9.0 mm) and `4x1.5` (OD 10.3 mm) exist in the Technical Handbook catalog!
  4. Separate entries were generated for `7Gx1,5 mm²` and `7Xx1,5 mm²` instead of grouping into one `7x1.5 mm²`.

### Verification & Proof:
- **Frontend Unit Tests** (`frontend/src/tests/`):
  - 53/53 tests passing (includes DIN/EPLAN conductor designations `2Xx`, `4Gx`, `7Xx`, `2Xx0.5`, lookupCatalogCableOd resolution, and mapping auto-normalization).
- **Frontend Production Build**:
  - `npm run build` completed cleanly with 0 TypeScript/Turbopack errors.
- **Backend Tests** (`backend/tests/test_routing_engine.py`):
  - 31/31 tests passing (includes direct lookup assertions for `2Xx1.5`, `2Xx1,5 mm²`, `4Gx1,5 mm²`, `4Xx1,5 mm²`, `4Gx2,5 mm²`).
- **Result**:
  - `2Xx1.5` and `4Gx1.5` now cleanly normalize to `2x1.5 mm²` and `4x1.5 mm²`.
  - Their outer diameters (9.0 mm and 10.3 mm) are automatically resolved from the manufacturer handbook catalog, freeing the user from having to enter them manually in the modal.

---

## 5. Task: Resolve `12x1.5 mm²` Mistakenly Resolving to OD `3.0 mm`
### Problem Diagnosis
- When querying `lookupCatalogCableOd("12x1.5 mm²")`:
  1. The multi-core parser checked `cores >= 1 && cores <= 5`. Because `12 > 5`, it failed to find a match in the 1..5 core tables.
  2. It then fell through to Step 3 (single-core cross-section regex `(\d+) mm²`), which extracted `1.5 mm²` from `12x1.5 mm²`.
  3. It matched a **1-core $1.5\text{ mm}^2$ single building wire** (H07V-K) in the 450/750V catalog, which has an outer diameter of **3.0 mm**!
  4. As a result, 12-core cables (and 7-core, 10-core, 18-core) received $3.0\text{ mm}$ instead of their true cable diameter ($\sim 14.8\text{ mm}$).
- **Physical Reality**:
  - $3.0\text{ mm}$ is only the outer diameter of **one single wire** inside the cable.
  - A $12\times 1.5\text{ mm}^2$ cable has 12 such wires bundled with fillers and an outer sheath, giving an actual outer diameter of **$14.8\text{ mm}$** (flexible control cable like Ölflex / YSLY-JZ) or **$17.5\text{ mm}$** (NYY-J).

### Fix Implemented
1. Added standard industrial multi-core flexible control cables to `LOW_VOLTAGE_CABLE_CATALOG` in `cable-catalog.ts` and `cable_catalog.py`:
   - `2x0.5 mm²`: OD = 5.6 mm
   - `7x1.5 mm²`: OD = 11.5 mm
   - `10x1.5 mm²`: OD = 13.8 mm
   - `12x1.5 mm²`: OD = 14.8 mm
   - `18x1.5 mm²`: OD = 17.2 mm
   - `18x0.75 mm²`: OD = 13.9 mm
2. In `lookupCatalogCableOd` (frontend & backend):
   - Expanded multi-core search to look up any number of cores in the catalog.
   - Guarded Step 3 so that any string matching a multi-core pattern (`(\d+)x...` or `(\d+)G...`) **never** falls through to single-core cross-section matching. Unlisted multi-core sizes return `null` and fall back to the default control OD (14.0 mm), never 3.0 mm.
3. Verification:
   - Frontend unit tests (53/53 pass).
   - Frontend production build (`npm run build` clean).
   - Backend pytest (31/31 pass).

---

## 6. Task: Remove Default Control Cable Setting Fallback & Require Missing Spec Modal for Uncatalogued Cables
### Problem & Requirement
- Currently, when importing or sizing cables that are not in the technical catalog (and not in custom rules), the system silently fell back to assigning `default_control_od_mm: 14.0 mm` (or 15.0 mm).
- The user requested:
  1. If a cable is not in the catalog, it must be added to the **Missing Spec modal** so the user can explicitly enter its OD.
  2. Do not use the default control cable setting (14.0 mm) as a silent fallback.
  3. Remove the default control cable setting fallback so uncatalogued cables are never silently auto-assigned 14 mm.

### Implementation Steps
1. **`frontend/src/lib/excel.ts` (`mapRawDataToCables`)**:
   - For any cable row without an explicit Excel OD and without a custom rule or catalog match:
     - Do NOT assign `defaultOdMap.control` or 14mm/15mm.
     - Leave `od_mm: undefined` (or 0) so the cable is marked unconfigured and added to `unconfigured` / missing specs.
2. **`frontend/src/components/missing-spec-od-modal.tsx`**:
   - For missing cable specifications:
     - Do NOT pre-fill with `14` from control defaults. Leave input blank (`""`) or placeholder, requiring explicit user input.
     - Display clear badge indicating the spec is uncatalogued.
     - Saving adds the user-entered value to `custom_od_by_type` and updates cables.
3. **`frontend/src/app/page.tsx` & `frontend/src/components/cables-table.tsx`**:
   - Ensure all uncatalogued cables without rules trigger the Missing Spec modal on import and show the missing OD indicator in the table.
4. **`frontend/src/components/defaults-settings-tab.tsx`**:
   - Remove or deprecate the default control cable OD fallback card, clearly explaining that uncatalogued control cables require explicit project rules or catalog definitions.
5. **`backend/app/routing_engine.py` & `frontend/src/lib/client-calculator.ts`**:
   - Ensure uncatalogued cables without an OD are marked as requiring configuration instead of silently adopting 14 mm.

### Verification & Proof
- Run `npm test` in `frontend/`:
  - Update `excel.test.mjs` and `calculator.test.mjs` to verify uncatalogued cables are NOT assigned 14mm and are flagged for Missing Spec modal.
- Run `npm run build` in `frontend/` to ensure zero compilation errors.
- Run `pytest tests` in `backend/` to verify calculations remain consistent.

---

## 7. Task: Logo Design for AutoTray-Router (CT cal)
### Goal & Scope
Create an industrial-grade brand identity and logo for **AutoTray-Router** (Cable Tray Routing & Sizing Engine). The identity must embody precision engineering, graph-based routing, and structural cable management while reading crisply down to 16 px in light, dark, and monochrome contexts.

### Planned Steps & Verification Proofs
1. **Phase 1 & 2: Discovery Brief & Concept Strategy**
   - Define exact brand parameters: Name: `AutoTray-Router` / `AutoTray`, Industry: Industrial Plant Engineering / Automation Developer Tools, Adjectives: *Industrial, Algorithmic, Structural, Precise*.
   - Formulate 3 distinct conceptual directions avoiding clichés (no loose wires, no generic lightbulbs, no cartoon lightning bolts).
   - *Proof*: Documented brief and concept definitions grounded in domain principles and library research (`search_library.py`).

2. **Phase 3 & 4: Geometric Construction in SVG (Black First)**
   - Construct 3 symbols on 256×256 viewBox:
     - **Concept A ("Routing Matrix / Riser Path")**: Multi-tier isometric/orthogonal routing lines with graph node junctions and elevation step, forming an engineered path.
     - **Concept B ("Ladder Tray Monogram 'A'")**: An industrial ladder cable tray structured into a solid, architectural letterform 'A' with rung geometry and optical corrections.
     - **Concept C ("Segregated Channel T")**: An extruded cable tray channel showing segregated power and control compartments separated by a central metallic barrier, forming an abstract 'T' / tray profile.
   - Construct companion horizontal wordmark lockups for each (`AutoTray-Router` / `AutoTray`).
   - *Proof*: Pure SVG vector files created in `assets/logo-concepts/` without live `<text>` tags or sub-pixel misalignment.

3. **Phase 5: Automated Testing & Visual Refinement**
   - Run `svg_audit.py` on all 3 concept marks and lockups to verify anchor complexity, symmetry, line angles, and absence of sub-pixel flaws.
   - Run `preview_sheet.py` to evaluate 16 px favicons, 32 px app icons, reversed dark-mode contrast, squint/silhouette tests, and category shelf test.
   - Render transparent PNGs using `render_png.py`.
   - *Proof*: `svg_audit.py` score $\ge 90/100$ on all concepts; 16 px icon legibility confirmed visually.

4. **Phase 6: Concept Checkpoint Presentation**
   - Generate combined comparison sheet `concepts.png` using `concept_sheet.py` showing mark, lockup, size ladder (64/32/16 px), and recommendation.
   - Present checkpoint message with concept overview image, rationale, honest trade-offs, and kit offer.
   - *Proof*: `concepts.png` generated and presented for user decision.

5. **Phase 7: Full Production Kit Execution (COMPLETED)**
   - Generated Master Vector SVGs:
     - `autotray-symbol-color.svg` (Electric Amber `#E65100` + Carbon Slate `#0F172A`)
     - `autotray-symbol-dark-mode.svg` (Electric Amber `#FF6B00` + Pure White `#FFFFFF`)
     - `autotray-symbol-black.svg` & `autotray-symbol-white.svg` (Pure 1-color `#000000` & `#FFFFFF`)
     - `autotray-lockup-horizontal-color.svg`, `autotray-lockup-horizontal-dark-mode.svg`, `autotray-lockup-horizontal-black.svg`, `autotray-lockup-horizontal-white.svg`
     - `autotray-lockup-stacked-color.svg`, `autotray-lockup-stacked-black.svg`, `autotray-lockup-stacked-white.svg`
   - Generated Web & PWA Icon Set (`export_variants.py`):
     - `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `favicon-48.png`
     - `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`, `maskable-512.png`
     - `site.webmanifest`, `head-snippet.html`
   - Generated High-Res PNG Renders (1024×1024 transparent).
   - Generated Client Presentation Board (`presentation_board.py`):
     - `presentation.html` with 5 interactive slides & real engineering mockups (GitHub README, terminal CLI, desktop app icon, website header, laptop sticker, social profile).
     - Individual slide PNGs (`slide-01.png` through `slide-05.png`).
   - Integrated Favicons into Next.js App (`frontend/src/app/favicon.ico`, `apple-icon.png`, `icon.svg`).
   - Comprehensive Guidelines: `branding/dist/BRAND_GUIDELINES.md`.
   - *Proof*: `svg_audit.py` 100/100 production score; 53/53 frontend tests pass; 12/12 backend verification checks pass.


---

## 8. Task: Move Sizing Parameters & Cable OD Defaults to Settings Page (Out of Workflow & Header)
### Problem & Requirement
- The user requested:
  1. Remove "3. Cable OD & Defaults" from the main numbered workflow steps (1..6).
  2. The workflow tabs should only contain the actual engineering process:
     - 1. Branches & Risers
     - 2. Cables Schedule
     - 3. Multi-Level Plant Topology
     - 4. Sizing Results Dashboard
     - 5. Bill of Materials (BOM)
  3. Move the buttons and settings from the photos into the dedicated Settings Page:
     - **Photo 1 Buttons**: `Cable OD Defaults`, `Load Plant Demo`, `Sample Template`.
     - **Photo 2 Sizing Parameters**: `Spare Design Margin %`, `Control Fill Limit %`, `Default Tray Side Height`, `Metallic Barrier / Divider` toggle.
     - **Cable Catalog & Custom Rules**: (from previous Tab 3) with full catalog browser, custom rules by type, and category defaults (with default control fallback removed).
  4. Top Header Navbar is streamlined:
     - Shows Brand, Project Switcher, "Upload Excel & Map Columns", "Calculate Sizing", and a clean "Settings" gear button.
     - Sizing sliders bar is removed from the sticky header and neatly housed inside the Settings page.

### Implementation Steps
1. **`frontend/src/components/header-config.tsx`**:
   - Remove the bottom parameters bar (Spare Margin slider, Control Fill slider, Tray Height selector, Barrier toggle).
   - Remove the 3 buttons from top navbar (`Cable OD Defaults`, `Load Plant Demo`, `Sample Template`).
   - Add a clean `Settings` button with a gear icon (`<Settings className="w-4 h-4 mr-1.5" /> Settings`) that switches to `settings` tab.
2. **`frontend/src/components/defaults-settings-tab.tsx` (or `settings-tab.tsx`)**:
   - Expand to be the full project & calculation Settings Page:
     - **Card 1: Sizing & Calculation Parameters** (Spare Margin %, Control Fill %, Default Tray Height, Metallic Barrier toggle, Single-Core Formation).
     - **Card 2: Cable OD Rules & Technical Catalog** (Searchable 100+ handbook catalog, custom rules by type, power/data defaults, no default control fallback).
     - **Card 3: Project Tools & Actions** (`Load Plant Demo`, `Download Sample Template`, `Reset to Defaults`).
3. **`frontend/src/app/page.tsx`**:
   - Re-index workflow tabs to:
     - 1. Branches & Risers
     - 2. Cables Schedule
     - 3. Multi-Level Plant Topology
     - 4. Sizing Results Dashboard
     - 5. Bill of Materials (BOM)
   - Remove the `"Standard Widths: 50 ➔ 700 mm"` badge element from the tab bar (from photo 3).
   - Add `<TabsTrigger value="settings">` placed on the right with a gear icon and `Settings` label.
   - Wire Settings tab content to the enhanced Settings component.
4. **`frontend/src/lib/excel.ts` (`mapRawDataToCables`) & `missing-spec-od-modal.tsx`**:
   - Do NOT fallback to `defaultOdMap.control` or 14mm/15mm for uncatalogued cables; leave `od_mm: undefined`.
   - Ensure all uncatalogued cables open in `MissingSpecOdModal` with blank input requiring explicit user entry.
### Verification & Proof (COMPLETED)
- **Frontend Unit Tests** (`frontend/src/tests/`):
  - 53/53 tests passing.
- **Frontend Production Build**:
  - `npm run build` completed cleanly in 2.3s with zero TypeScript / compilation errors.
- **Backend Tests** (`backend/tests/`):
  - 31/31 pytest tests passing.
- **Result**:
  - Workflow sequence is cleanly streamlined to 5 steps: 1. Branches & Risers, 2. Cables Schedule, 3. Multi-Level Plant Topology, 4. Sizing Results Dashboard, 5. Bill of Materials (BOM).
  - "Standard Widths: 50 ➔ 700 mm" badge removed from tab bar.
  - Sticky header uncluttered: Photo 1 buttons and Photo 2 sliders relocated into dedicated Settings page.
  - Settings page accessible via top-header Settings button and right-aligned Settings tab.
  ---

## 9. Task: Display Parent Panel Hint for External Field Devices in Cables Table
### Problem Diagnosis & Goal
- When importing industrial schedules with field equipment (e.g. `=P101+E-93D1`, `=P101+E-93P2`, `=P101+E-155D1`, `=P301+E-50A1`), Method 2 extracts clean equipment drop points (`E-93D1`, `E-93P2`, `E-155D1`, `E-50A1`).
- In the Cables Schedule table, the user sees nodes like `E-93D1` ➔ `E-93P2` flagged as missing in branches, but the table does not indicate which electrical panel/cabinet they belong to.
- **Goal**: Clearly display and hint the parent panel for all external field devices in the table cells, hover tooltips, and branch missing-node diagnostics (e.g. `Panel: P101`).

### Implementation Steps
1. **Data Model Updates** (`frontend/src/lib/types.ts` & `backend/app/models.py`):
   - Add optional `source_panel?: string` and `dest_panel?: string` fields to `Cable` interface and Pydantic model.
2. **Excel Import Panel Capture** (`frontend/src/lib/excel.ts`):
   - In `mapRawDataToCables`, extract panel from:
     - Explicit `Source Panel` / `Dest Panel` / `Owning Panel` columns.
     - The raw IEC reference prefix `=<Panel>+...` (e.g., from `=P101+E-93D1`, extract `P101`).
   - Store `source_panel` and `dest_panel` on each `Cable` object.
3. **Global Node-to-Panel Resolution Registry** (`frontend/src/components/cables-table.tsx`):
   - Create a reactive lookup map `devicePanelMap` from the cables schedule.
   - Maps each device node (e.g. `E-93D1`) to its parent panel (e.g. `P101`).
   - Resolves panels even for field-to-field cables (`E-93D1` ➔ `E-93P2`) by associating devices with their connected panel or raw prefix.
4. **UI Presentation in Cables Table** (`frontend/src/components/cables-table.tsx`):
   - Under the node input cell, when a node is an external field device (e.g., starts with `E-` or has an associated parent panel), render a compact, clean badge:
     `🏷️ Panel: P101`
   - On hover / tooltip:
     Display full contextual hint: `External field device belonging to panel: P101`.
   - When node is unrouted / missing in branches (red outline `!`):
     Tooltip advises: `Field device belonging to panel P101. Add branch: P101 ➔ E-93D1.`
### Verification & Proof (COMPLETED)
- **Frontend Unit Tests** (`frontend/src/tests/`):
  - 56/56 unit tests passing.
  - Added test verifying extraction of `source_panel` and `dest_panel` from raw IEC prefixes (`=P101+...`) and mapped panel columns.
  - Added test verifying `calculateBranchSizing` preserves `source_panel` and `dest_panel` and injects parent panel hints (`[Panel: P101]`) into unrouted diagnostics.
- **Frontend Production Build**:
  - `npm run build` compiled cleanly with Next.js Turbopack in 1.7s and 0 TypeScript / compilation errors.
- **Backend Tests** (`backend/tests/`):
  - 32/32 pytest tests passing.
  - Added `test_panel_preservation_and_diagnostics` verifying `CableRoutingResult`, `CableRoutedDetail`, and unrouted reason hints with `[Panel: P101]`.
- **UI Behavior**:
  - Under external field device nodes in the Cables Schedule table, a compact pill badge `Panel: P101` is rendered.
  - Hover tooltip displays: `External device belonging to panel: P101`.
  - Missing branch alert tooltip alerts: `Source node 'E-93D1' not found in any branch segment! (External device belonging to panel: P101)`.

---

## 10. Task: Fix Duplicate Cable Tag Route Status Collision & Add Duplicate Tag Indicator
### Problem Diagnosis & Root Cause
- In industrial schedules (e.g. user's `media_1791189997079.xlsx`), duplicate cable tags exist across different subsystems:
  - Row 2: `=GEN-1W001` from `P101` ➔ `P181` (Data cable, 4x2 0.56 mm²)
  - Row 14: `=GEN-1W001` from `LVD` ➔ `GEN` (Power cable, 1x95 mm²)
- Both the backend and client calculation engines correctly route Row 2 onto the `P101-P181` tray branch.
- However, in `cables-table.tsx`:
  - `routeMap` indexed `CableRoutingResult` solely by `cable_tag`.
  - When iterating `routingResults`, the second `=GEN-1W001` (`LVD` ➔ `GEN`, unrouted because LVD/GEN are not in the branch list) overwrote the first `=GEN-1W001` in the map.
  - As a result, the first `=GEN-1W001` row in the table displayed the Unrouted error of the second cable (`Endpoint missing in branch network: Source 'LVD', Dest 'GEN'`).

### Implementation Steps
1. **Disambiguated Route Resolution in `cables-table.tsx`**:
   - Primary: Exact row index matching (`routingResults[originalIdx]`), which is 1-to-1 aligned with `cables`.
   - Secondary: Composite key `${c.cable_tag}:::${c.source_node.trim()}:::${c.dest_node.trim()}`.
   - Fallback: `c.cable_tag`.
2. **Duplicate Tag Detection & Indicator**:
   - Compute `duplicateTagsSet` across `cables`.
   - In the Cable Tag table cell, if a cable shares its tag with another row, display an amber badge:
     `⚠️ Duplicate Tag` with tooltip `Multiple cables share tag "=GEN-1W001". Verify cable numbering in your electrical schedule.`
### Verification & Proof (COMPLETED)
- **Frontend Unit Tests** (`frontend/src/tests/`):
  - 58/58 unit tests passing.
  - Added test verifying schedules with duplicate cable tags resolve independently:
    - Cable 1 (`=GEN-1W001`, `P101` ➔ `P181`): `status: "ROUTED"`.
    - Cable 2 (`=GEN-1W001`, `LVD` ➔ `GEN`): `status: "UNROUTED"`.
- **Frontend Production Build**:
  - `npm run build` compiled cleanly with Next.js Turbopack in 1.5s with zero errors.
- **Backend Tests** (`backend/tests/`):
  - 32/32 pytest tests passing.
- **UI Behavior**:
  - Cable 1 (`P101` ➔ `P181`) now correctly renders **Routed (green)** with its tray length and path segments.
  - An amber badge `⚠️ Duplicate Tag` appears below any cable tags that are duplicated across the schedule.
  - Hovering over `⚠️ Duplicate Tag` informs the user: `Tag '=GEN-1W001' appears multiple times in schedule. Routing is disambiguated by row and endpoints.`

---

## 11. Task: Complete Redesign of AutoTray-Router Logo (Unmistakable Industrial Cable Tray)
### Goal & Motivation
The previous logo iteration leaned too far into abstract chevron/arrow geometry and failed to communicate an actual physical cable tray. This redesign replaces the abstract geometry with authentic, unmistakable industrial cable tray hardware elements: structural C-channel side rails (stringers), transverse welded ladder rungs, and organized cable conduit bundles.

### Planned Steps & Verification Proofs
1. **Geometric Construction of 3 Authentic Cable Tray Concepts**:
   - **Concept A ("The Isometric Ladder Tray")**:
     - 3D isometric view of an industrial heavy-duty ladder cable tray.
     - Two distinct C-channel side rails with flanges, 4-5 evenly spaced transverse ladder rungs, and 3 parallel colored cables routed along the tray bed.
     - *Proof*: Clean SVG markup on 256×256 viewBox, audited via `svg_audit.py` ($\ge 90/100$, zero `<text>`, clean 30°/60°/isometric angles).
   - **Concept B ("The 90° Tray Routing Elbow")**:
     - Axonometric/plan view of a 90° curved cable tray fitting with concentric inner/outer side rails, radial ladder rungs, and bundled cables smoothly navigating the bend.
     - *Proof*: Clean SVG markup on 256×256 viewBox, audited via `svg_audit.py` ($\ge 90/100$).
   - **Concept C ("The Technical Tray Cross-Section")**:
     - Frontal engineering cross-section of a heavy-gauge U-profile tray with side-rail return lips and a central metallic divider plate, packed with circular cable bundles.
     - *Proof*: Clean SVG markup on 256×256 viewBox, audited via `svg_audit.py` ($\ge 90/100$).
2. **Horizontal Wordmark Lockups**:
   - Update companion horizontal lockups for each concept (`AUTOTRAY ROUTER`).
3. **Automated Testing & Concept Checkpoint**:
   - Run `svg_audit.py` and `preview_sheet.py`.
   - Run `concept_sheet.py` to generate `concepts.png` with scale ladders (64/32/16 px) and present at the checkpoint for user review.
4. **Full Production Kit Execution for Concept A (Isometric Ladder Tray)**:
   - **Step 4.1: Master Vector SVGs (`branding/dist/svg/`)**:
     - `autotray-symbol-color.svg`: Master 3D isometric ladder tray with C-channel side rails, 5 transverse rungs, and 3 color-coded cables (Power Blue `#2563EB`, Control Amber `#E65100`, Data Emerald `#059669`).
     - `autotray-symbol-dark-mode.svg`: Inverted contrast rails (`#FFFFFF` / `#CBD5E1`) with luminous cables.
     - `autotray-symbol-black.svg` & `autotray-symbol-white.svg`: 1-color pure silhouettes with optical separation cuts.
     - `autotray-symbol-mono.svg`: Single-color brand amber cut.
     - `autotray-symbol-small.svg`: 16px/32px micro-cut with thicker rungs and expanded clearances.
     - `autotray-lockup-horizontal-color.svg`, `autotray-lockup-horizontal-dark-mode.svg`, `autotray-lockup-horizontal-black.svg`, `autotray-lockup-horizontal-white.svg`.
     - `autotray-lockup-stacked-color.svg`, `autotray-lockup-stacked-dark-mode.svg`, `autotray-lockup-stacked-black.svg`, `autotray-lockup-stacked-white.svg`.
     - *Proof*: Run `svg_audit.py` on all master SVGs; must achieve $\ge 90/100$, 0 live `<text>`, 0 embedded rasters.
   - **Step 4.2: Web & PWA Icon Set (`branding/dist/web/`)**:
     - Run `export_variants.py` targeting `autotray-symbol-small.svg` as favicon source.
     - Generates `favicon.ico` (multi-resolution 16/32/48), `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`, `head-snippet.html`.
     - *Proof*: Verify all web icon files exist and are valid non-zero images.
   - **Step 4.3: High-Res PNG Deliverables (`branding/dist/png/`)**:
     - Export 1024×1024 transparent PNGs for symbol, horizontal lockup, and stacked lockup in color, dark mode, black, and white.
     - *Proof*: Files generated and verified in `branding/dist/png/`.
   - **Step 4.4: Client Presentation Board (`branding/dist/presentation/`)**:
     - Run `presentation_board.py` generating `presentation.html` and 6 slide PNGs tailored to Concept A with developer & engineering mockups (README, CLI Terminal, App Icon, Web Header, Laptop Sticker, Social Profile).
     - *Proof*: `presentation.html` and slide PNGs generated in `branding/dist/presentation/slides/`.
   - **Step 4.5: Brand Guidelines Documentation (`branding/dist/BRAND_GUIDELINES.md`)**:
     - Complete one-page brand standard specifying clear space, minimum size (16px), color codes (HEX/RGB/CMYK), typography specs, approved backgrounds, and misuse rules.
     - *Proof*: `BRAND_GUIDELINES.md` written in `branding/dist/`.
   - **Step 4.6: Deploy to Next.js Application (COMPLETED)**:
     - Deployed `favicon.ico`, `apple-icon.png`, and `icon.svg` to `frontend/src/app/`.
     - Integrated `AutoTrayLogo` vector component into `frontend/src/components/header-config.tsx`.
     - *Proof*: Next.js production build (`npm run build`) completed cleanly with Turbopack in 2.4s; all 58 frontend unit tests pass; all 33 backend pytest checks pass.

### Final Verification & Results (COMPLETED)
- **Vector Audit**: Master symbol achieved **98/100** production rating on `svg_audit.py` with 0 `<text>` tags, 0 rasters, clean 30°/150° isometric geometry.
- **Production Asset Deliverables**:
  - `branding/dist/svg/`: Master vector SVGs (color, dark mode, black, white, mono, and 16px micro-cut).
  - `branding/dist/web/`: Multi-resolution `favicon.ico` (16/32/48), `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`, `head-snippet.html`.
  - `branding/dist/png/`: 1024×1024 transparent master PNGs.
  - `branding/dist/presentation/`: Interactive presentation board (`presentation.html`) and slide renders (`slide-01.png` to `slide-05.png`).
  - `branding/dist/BRAND_GUIDELINES.md`: Comprehensive brand specifications and misuse rules.
- **Frontend Verification**: 58/58 tests passing (`npm test`).
- **Backend Verification**: 33/33 tests passing (`pytest tests`).












---

## 12. Task: Fix Layout of Excel Import Modal (Column Mapping, Field Alignment & Stepper)
### Problem Diagnosis & Deficiencies
1. **Orphan Field & Broken Grid in Cable Mapping**:
   - The 9 cable mapping fields were rendered inside a flat `grid grid-cols-2 sm:grid-cols-4 gap-3`.
   - Row 1: `Cable Tag / ID`, `Source Node (From)`, `Dest Node (To)`, `Cable Spec / Type`.
   - Row 2: `No. of Cores`, `Conductor Size`, `Outer Diameter`, `Source Panel`.
   - Row 3: `Dest Panel` isolated in Column 1 with 3 empty columns (75% dead space).
   - Paired concepts were broken: `Source Panel` was in Row 2, Col 4, while `Dest Panel` was placed at Row 3, Col 1 on the opposite side of the screen.
2. **Vertical Dropdown Misalignment**:
   - Label hints such as `Conductor Size (mm²): (Optional, e.g. 1.5)` wrapped onto two lines inside the ~185px column, pushing the `<select>` input down by ~16px compared to adjacent columns whose labels fit on one line.
   - Result: Form inputs in the same row were jagged and misaligned.
3. **Branches Mapping Grid Imbalance**:
   - 7 fields in a 4-column grid left 1 trailing blank slot and mixed routing endpoints with tray physical dimensions.
4. **Stepper Navigation Polish**:
   - The stepper circles remained grey `bg-slate-100` even when active or completed, only changing text color.
5. **IEC 81346 Method 2 Banner**:
   - Awkward parenthetical spacing `( +M- , +F- )` and lack of structured pill layout.

### Implementation Steps
1. **Restructure Cables Column Mapping**:
   - **Section A: Cable Core Identification & Sizing**:
     - `Cable Tag / ID *` (Required)
     - `Cable Spec / Type` (Optional, e.g. 4x1.5 mm²)
     - `Outer Diameter (mm)` (Optional, Auto-lookup)
     - Sub-spec row: `No. of Cores (Optional)` & `Conductor Size (mm²)` with dedicated subtitle hints to prevent label wrapping.
   - **Section B: Routing Endpoints & Associated Panels (Symmetrical 2x2 Grid)**:
     - Clear visual cards or side-by-side columns:
       - **Source / Origin**: `Source Node (From) *` + `Source Panel` (Optional)
       - **Destination / Target**: `Dest Node (To) *` + `Dest Panel` (Optional)
     - Zero orphan fields; paired inputs are directly aligned.
2. **Standardize Label & Input Layout**:
   - Use flex container with consistent label heights and separated hint text so `<select>` inputs in every row align to the exact same baseline.
   - Enhanced select element styling (clean border, focus ring, subtle shadow, uniform height).
3. **Restructure Branches Column Mapping**:
   - Balanced 2-group layout:
     - Group 1 (Tray Trajectory & Endpoints): `Branch ID *`, `Node From (Start) *`, `Node To (End) *` (3 columns).
     - Group 2 (Tray Dimensions & Geometry): `Length (m) *`, `Elevation / Level`, `Type / Orientation`, `Side Height (mm)` (4 columns).
4. **Enhance Stepper Navigation**:
   - Distinct visual state for Completed (check icon with emerald/blue badge), Active (blue circle with bold text), and Upcoming (muted).
5. **Refine IEC 81346 Banner**:
   - Clean badges for `+M-`, `+F-`, `+E-` with smooth typography and layout.

### Verification & Proof
- Run `npm test` in `frontend/` (all 58 tests pass).
- Run `npm run build` in `frontend/` (clean Turbopack compilation).
- Verify modal across all scopes (`both`, `cables_only`, `branches_only`) and responsive screen sizes.

---

## 13. Task: Configurable Control & Signal Cable Laying Method (Multi-layer Stacked vs Single Layer Flat)
### Goal & Motivation
By default, the engine models control and signal cables using NEC 392 / IEC 61537 multi-layer volumetric packing ($W = \frac{\text{Area}}{H_{\text{tray}} \times \text{Fill}} \times S_{\text{factor}}$), which produces fractional floor widths (e.g. $2.55\text{ mm}$ for a $10\text{ mm}$ cable in a $100\text{ mm}$ tray).
However, certain EPC project specifications strictly mandate **Single Layer Flat Laying** (no stacking) for all cables or for specific instrumentation/control lines, where each cable occupies its full Overall Diameter plus spare margin directly on the tray floor (e.g. $10\text{ mm} \times 1.30 = 13.0\text{ mm}$).
This task introduces a project-level setting `control_cable_laying_method`:
- `'multi_layer'` (default): Volumetric area packing based on tray height and maximum fill percentage.
- `'single_layer'`: Flat touching layout where width contribution is calculated as $\text{OD} \times \text{Qty} \times S_{\text{factor}}$, with formation tagged as `"flat_touching"`.

### Implementation Steps
1. **Data Models**:
   - `backend/app/models.py`: Add `control_cable_laying_method: str = Field("multi_layer", description="Laying method for control/signal/data cables: 'multi_layer' or 'single_layer'")` to `CalculationParameters`.
   - `frontend/src/lib/types.ts`: Add `control_cable_laying_method?: 'multi_layer' | 'single_layer'` to `CalculationParameters`.
2. **Backend Engine (`backend/app/routing_engine.py`)**:
   - In branch sizing loop, check `parameters.control_cable_laying_method`:
     - If `'single_layer'`:
       - `ctrl_width_mm = sum(get_effective_cable_od(c, parameters) * c.count for c in ctrl_cables)`
       - `data_width_mm = sum(get_effective_cable_od(c, parameters) * c.count for c in data_cables)`
       - In `cables_detail` for non-power cables:
         `w_contrib = eff_od * c.count * spare_factor`
         `c_form_val = "flat_touching"`
     - If `'multi_layer'`:
       - Maintain current area formula ($\frac{\text{Area}}{H \times \text{fill}} \times S_{\text{factor}}$) and `c_form_val = None`.
3. **Frontend Calculation Engine (`frontend/src/lib/client-calculator.ts`)**:
   - Replicate the exact dual-mode logic in client-side routing and sizing for real-time reactivity without backend latency.
4. **Project Settings UI (`frontend/src/components/defaults-settings-tab.tsx`)**:
   - Add a dedicated selection card **"Control & Signal Cable Laying Method"**:
     - Option 1: **Multi-layer Stacked (NEC / IEC Area Packing)** with badge `Standard` and formula explanation.
     - Option 2: **Single Layer Flat (Full OD)** with badge `Touching` and formula explanation ($W = \text{OD} \times \text{spare}$).
5. **Cables Table UI (`frontend/src/components/results-table.tsx` / `cables-table.tsx`)**:
   - Ensure the Formation badge displays `Flat Touching` for control cables when `single_layer` is active.

### Verification & Proof (COMPLETED)
- **Backend Pytest** (`backend/tests/test_routing_engine.py`):
  - 33/33 pytest tests passing.
  - Added `test_control_cable_laying_method_multi_vs_single_layer` verifying:
    - `multi_layer` mode: $10\text{ mm}$ cable in $100\text{ mm}$ tray with $30\%$ spare yields $2.55\text{ mm}$ width contribution.
    - `single_layer` mode: $10\text{ mm}$ cable with $30\%$ spare yields $13.0\text{ mm}$ width contribution ($10 \times 1.30$), with `formation="flat_touching"` and total branch width = $13.0\text{ mm}$.
- **Frontend Jest/Node Tests** (`frontend/src/tests/`):
  - 60/60 unit tests passing.
  - Added unit test asserting client-side calculator behavior matches backend in both modes.
- **Frontend Production Build**:
  - `npm run build` compiled cleanly with Next.js Turbopack with 0 errors.
- **UI Behavior**:
  - In `Settings > Project Parameters`, users can toggle between:
    - **Multi-layer Stacked (Area Fill Method)** [NEC 392 / IEC Standard]
    - **Single Layer Flat (Touching)** [Full OD]

---

## 14. Task: Dedicated Nodes & Cable Tray Fittings Page with Smart Fitting Sizing, Reducer Detection & BOM Integration
### Goal & Motivation
In industrial cable tray design, intersection and termination nodes represent physical tray fittings (Horizontal Tees, 90°/45° Elbows, 4-Way Crosses, Vertical Riser Bends, Straight Couplers, and End Caps).
When branches of differing widths converge at a node (e.g. Branch A = 400mm, Branch B = 400mm, Branch C = 200mm at Node 1):
1. The fitting must adapt its nominal size to the **widest connected branch** (here, 400mm).
2. Any narrower branch (Branch C: 200mm) requires an in-line **Reducer** (e.g. 400mm -> 200mm) installed at that port.
3. These fittings and reducers must be accurately quantified and listed in the Bill of Materials (BOM) and the exported Excel engineering report.

### Implementation Steps
1. **Data Models (`frontend/src/lib/types.ts` & `backend/app/models.py`)**:
   - Define `FittingType`, `ReducerType`, `NodePortReducer`, `NodeFittingConfig`, `FittingBomItem`, and `ReducerBomItem`.
   - Add `node_fittings?: Record<string, NodeFittingConfig>` to `Project` and `CalculationResponse`.
2. **Fittings Calculation Engine (`frontend/src/lib/fittings-engine.ts` & `backend/app/routing_engine.py`)**:
   - Extract unique topological nodes from branches.
   - Auto-suggest default fitting types by branch degree and orientation (4 branches -> Cross, 3 branches -> Tee, 2 branches -> Elbow/Riser, 1 branch -> End Cap).
   - Adapt fitting size to $\max(\text{connected branch widths})$.
   - Compute port-specific reducers for branches with $\text{width} < \text{max width}$ with toggle and geometry selection (Concentric, Left/Right Eccentric).
   - Aggregate fittings and reducers into `BillOfMaterials`.
3. **UI - Nodes & Fittings Workspace Tab (`frontend/src/components/nodes-fittings-tab.tsx` & `page.tsx`)**:
   - Dedicated tab: `3. Nodes & Fittings` in main navigation.
   - Interactive table: Node ID, Level, Connected Branches with Sized Widths, Fitting Type dropdown, Nominal Size, Port Reducers with enable/disable toggles and geometry selector, and Reset actions.
4. **UI - BOM Tab Integration (`frontend/src/components/bom-tab.tsx`)**:
   - Add dedicated "Tray Fittings & Reducers Schedule" section with KPIs and detailed schedules.
5. **Excel Export (`backend/app/excel_exporter.py`)**:
   - Add dedicated "Fittings & Reducers" worksheet with professional engineering styling.

### Verification & Proof (COMPLETED)
- **Frontend Unit Tests** (`frontend/src/tests/fittings.test.mjs`):
  - Added 3 comprehensive test suites: Heuristic detection by branch count and orientation, node sizing adaptation to max branch width with automatic reducer generation, and user overrides persistence.
  - Run `npm test` in `frontend/`: 63/63 unit tests passing.
- **Backend Unit Tests** (`backend/tests/test_routing_engine.py` & `backend/tests/test_excel_exporter.py`):
  - Added unit test `test_network_node_fittings_and_reducers` and updated `test_excel_export_generation` to assert the new `Fittings & Reducers` Excel worksheet.
  - Run `.\.venv\Scripts\python.exe -m pytest tests` in `backend/`: 34/34 pytest tests passing.
- **Frontend Production Build**:
  - Run `npm run build` in `frontend/`: Clean Turbopack compilation with 0 TypeScript/ESLint errors in 3.2s.

---

## 15. Task: APV Industrial Cable Tray Fittings Catalog & Visual Picture System
### Goal & Scope
Integrate the complete industrial cable tray fittings catalog from the provided APV Solid/Perforated Systems specification (Page 1 & Page 2), and add high-definition visual engineering pictures/diagrams for every fitting and reducer in the Nodes & Fittings workspace, selection menus, and Bill of Materials to maximize engineering clarity and know-how.

### 1. Complete Catalog Inventory from PDF Specification
Based on the APV Solid / Perforated Systems catalog:
1. **Straight Cable Trays & Covers**:
   - `Perforated Cable Tray` + `Perforated Cable Tray Cover`
   - `Solid Cable Tray` + `Solid Cable Tray Cover`
2. **Horizontal Junctions (Tees & Crosses)**:
   - `Equal Tee` (Horizontal 3-Way Tee) + `Equal Tee Cover`
   - `Half Equal Tee` (Horizontal Branch Offset Tee) + `Half Equal Tee Cover`
   - `Crosspiece` (Horizontal 4-Way Cross) + `Crosspiece Cover`
   - `Vertical Downward Skewed Tee` (Branch tee with vertical drop port)
3. **Horizontal Bends (Flat Bends / Elbows)**:
   - `90° Flat Bend` (Horizontal 90° Elbow) + `90° Flat Bend Cover`
   - `45° Flat Bend` (Horizontal 45° Elbow) + `45° Flat Bend Cover`
   - `Closed Bend` (Terminal closed 90° bend / End termination)
4. **Vertical Riser Bends (Vertical Elbows & Offsets)**:
   - `90° Inside Riser` (Upward 90° vertical bend) + `90° Inside Riser Cover`
   - `90° Outside Riser` (Downward 90° vertical bend) + `90° Outside Riser Cover`
   - `45° Inside Riser` (Upward 45° vertical bend) + `45° Inside Riser Cover`
   - `45° Outside Riser` (Downward 45° vertical bend) + `45° Outside Riser Cover`
   - `Right Downward Skewed Bend` (3D compound downward skewed offset bend)
5. **Reducers (Width & Depth Transitions)**:
   - `Reducer` (Concentric In-Line Width Reducer) + `Reducer Cover`
   - `Left Reducer` (Eccentric Left Width Reducer) + `Left Reducer Cover`
   - `Right Reducer` (Eccentric Right Width Reducer) + `Right Reducer Cover`
   - `Height Reducer` (Step-down vertical transition in side flange height, e.g. 100mm to 60mm)
6. **Panel & Equipment Terminations**:
   - `Electrical Board Outlet` (Direct top-entry or bottom-entry fitting flange for electrical switchboards/cabinets)
   - `Straight Splice Coupler` (Coupler joint plates with fasteners)
   - `None / Pass-Through` (Unbroken continuous tray run)

### 2. Implementation Steps

#### Step 1: Data Model Expansion (`types.ts` & `models.py`)
- Expand `FittingType` union in `frontend/src/lib/types.ts` and `backend/app/models.py`:
  - `'horizontal_tee'` (Equal Tee)
  - `'horizontal_half_tee'` (Half Equal Tee)
  - `'horizontal_cross'` (Crosspiece / 4-Way Cross)
  - `'horizontal_elbow_90'` (90° Flat Bend)
  - `'horizontal_elbow_45'` (45° Flat Bend)
  - `'vertical_inside_riser_90'` (90° Inside Riser)
  - `'vertical_outside_riser_90'` (90° Outside Riser)
  - `'vertical_inside_riser_45'` (45° Inside Riser)
  - `'vertical_outside_riser_45'` (45° Outside Riser)
  - `'vertical_downward_tee'` (Vertical Downward Skewed Tee)
  - `'skewed_downward_bend'` (Right Downward Skewed Bend)
  - `'electrical_board_outlet'` (Electrical Board Outlet)
  - `'closed_bend'` (Closed Bend / End Cap)
  - `'straight_coupler'` (Straight Splice Coupler)
  - `'none'` (None / Pass-Through)
- Expand `ReducerType`:
  - `'concentric'` (Concentric Reducer)
  - `'eccentric_left'` (Left Reducer)
  - `'eccentric_right'` (Right Reducer)
  - `'height_reducer'` (Height Reducer)
- Add optional `include_covers?: boolean` in `NodeFittingConfig` and project parameters to support automated fitting cover take-off.

#### Step 2: High-Quality Engineering Vector SVG Graphics Library
- Create dedicated SVG icons/illustrations component `frontend/src/components/fitting-illustrations.tsx`:
  - 2.5D clean engineering isometric line-and-fill art matching the APV catalog 3D render style:
    - Silver-slate metallic finish (`#64748B`, `#94A3B8`, `#CBD5E1`, `#F1F5F9`)
    - Distinctive side flanges, bend radii, perforated/solid texture accents, and port arrows.
  - Component `FittingThumbnail({ type, className, size })` and `ReducerThumbnail({ type, className, size })`.
  - Comprehensive metadata registry `FITTING_CATALOG_REGISTRY`:
    - Code, Name, APV Catalog Title, Category (Horizontal Junction, Flat Bend, Vertical Riser, Reducer, Termination), Description, Port Count, Angles.

#### Step 3: Interactive Visual Selector & Preview in Nodes & Fittings Tab
- Replace native HTML `<select>` with a rich visual picker:
  - Each item displays:
    - High-res SVG thumbnail of the fitting.
    - Fitting primary name + APV catalog designation (`Equal Tee`, `90° Flat Bend`, `90° Inside Riser`, etc.).
    - Badge indicating junction geometry (3-Port, 4-Port, 90° Turn, Vertical Drop, etc.).
  - Table row displays:
    - Clickable 44×44 px thumbnail preview with quick hover zoom and tooltip.
    - Dialog/Modal preview when clicked showing full 3D visual, nominal dimensions, port connections, and cover option.
  - Port Reducers column:
    - Display visual SVG thumbnail for Concentric, Left Reducer, Right Reducer, and Height Reducer next to each reduction ratio ($W_1 \rightarrow W_2$).

#### Step 4: BOM & Excel Report Integration
- In `frontend/src/components/bom-tab.tsx`:
  - Add fitting thumbnail pictures inside the Fittings & Reducers schedule table rows.
  - Itemize covers in the accessories/take-off table when `include_covers` is selected.
- In `backend/app/excel_exporter.py`:
  - Include APV standard fitting classification and cover take-off rows in the "Fittings & Reducers" worksheet.

#### Step 5: Verification & Automated Tests
- Update frontend unit tests in `frontend/src/tests/fittings.test.mjs` for all new APV fitting types.
- Update backend unit tests in `backend/tests/test_routing_engine.py` and `backend/tests/test_excel_exporter.py`.
- Run `npm test` in `frontend/` (ensure 100% pass).
- Run `.\.venv\Scripts\python.exe -m pytest tests` in `backend/` (ensure 100% pass).
- Run `npm run build` in `frontend/` (ensure 0 TypeScript/Turbopack errors).



