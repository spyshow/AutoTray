# PLAN: Filterable Select Input (Combobox) for From Node & To Node from Cable List

## 1. Goal
When adding or editing cable tray branches in the **Branches & Risers** table, the "From Node" (`node_from`) and "To Node" (`node_to`) inputs should be a searchable/filterable select input (combobox). The selectable options must be dynamically populated from the cable list's "Source (From Node)" and "Destination (To Node)" (plus existing branch junction nodes). Users can type to filter options, pick an existing node with one click or Enter, or freely enter a custom node name. The same intelligent node completion is also made available to the **Cables Schedule** table for end-to-end consistency.

---

## 2. Technical Architecture & Analysis
1. **Dynamic Node Options Collection**:
   - In `BranchesTable`, derive `availableNodeOptions` from:
     - `cables.flatMap(c => [c.source_node?.trim(), c.dest_node?.trim()])`
     - `branches.flatMap(b => [b.node_from?.trim(), b.node_to?.trim()])`
   - Filter out empty strings, normalize, deduplicate, and sort alphabetically with natural order.
2. **Inline Filterable Combobox (`NodeComboboxCell`)**:
   - Provide an input field that displays the current node value and preserves the table's clean look and feel.
   - When focused or clicked, opens a floating dropdown listing matching node options filtered by user input.
   - Displays a clean badge/counter (e.g., node name, tag).
   - Allows keyboard navigation (ArrowUp, ArrowDown, Enter, Escape).
   - Allows free-form typing so intermediate junction nodes (e.g. `J01`, `NODE_5`) not in the cable list can still be entered without limitation.
   - Commits changes via `onSave(newValue)` when an item is selected or when blurred/submitted.
3. **Data Flow**:
   - Pass `cables={cables}` to `BranchesTable` in `frontend/src/app/page.tsx`.
   - In `frontend/src/components/branches-table.tsx`, replace `EditableCellInput` for `node_from` and `node_to` with `NodeComboboxCell`.
   - In `frontend/src/components/cables-table.tsx`, enhance `source_node` and `dest_node` with `NodeComboboxCell` while retaining existing validation alerts.

---

## 3. Implementation Steps

### Step 1: Create `NodeComboboxCell` Component
- Create `frontend/src/components/node-combobox-cell.tsx`:
  - Input field with subtle dropdown toggle indicator (chevron).
  - Floating portal/popover with z-index (`z-50`) to avoid clipping by table rows.
  - Live filtering against `options: string[]`.
  - Highlight matching substrings or show clean list.
  - Keyboard accessibility (Arrow navigation, Enter selection, Escape dismiss).
- **Proof it works**: Component renders, filters options correctly based on query, and invokes `onSave` when an option is clicked or typed.

### Step 2: Update `page.tsx` & `BranchesTable`
- In `frontend/src/app/page.tsx`:
  - Pass `cables={cables}` to `<BranchesTable ... />`.
- In `frontend/src/components/branches-table.tsx`:
  - Accept `cables?: Cable[]` in props.
  - Derive `nodeOptions` using `useMemo` from `cables` and `branches`.
  - Replace `EditableCellInput` for `node_from` and `node_to` columns with `<NodeComboboxCell value={...} options={nodeOptions} onSave={...} />`.
- **Proof it works**: Loading cables or branches immediately populates the "From Node" and "To Node" combobox options with cable source and destination nodes.

### Step 3: Enhance `CablesTable` Node Fields
- In `frontend/src/components/cables-table.tsx`:
  - Derive `nodeOptions` from `branches` and `cables`.
  - Use `NodeComboboxCell` for `source_node` and `dest_node` while preserving the validation warning icon (`AlertCircle`) and panel badge.
- **Proof it works**: Editing cable endpoints in CablesTable allows selecting from known branch nodes.

### Step 4: Verification & Automated Tests
- Run `npm test` in `frontend` (all 101+ tests passing).
- Run backend tests via `pytest` (all 45 tests passing).
- Run `npm run build` in `frontend` to verify TypeScript types and production build.
- **Proof it works**: Tests pass, build succeeds with 0 errors.
