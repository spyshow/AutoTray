# PLAN: Treat Node N024 and N24 as Distinct Entities Across All Systems

## 1. Problem Diagnosis
In industrial and plant network naming conventions, node identifiers differing only in leading zero padding (e.g. `N024` vs `N24`) represent distinct, intentional physical or logical endpoints.
Currently:
1. `findNodeSuggestion` in both `client-calculator.ts` and `backend/app/routing_engine.py` computes Levenshtein distance between `N024` and `N24` as `1`. Because `1 <= 2`, if a cable references `N024` and `N24` exists in branches, the system outputs: `(Did you mean 'N24'?)`, mistakenly treating `N024` as a typo of `N24`.
2. When sorting node options or calculated fittings, `a.localeCompare(b, undefined, { numeric: true })` treats `N024` and `N24` as numeric equivalents (`24 == 24`), returning `0` (equality) without a strict lexicographical tiebreaker.

## 2. Requirements
- Node `N024` and node `N24` must never be conflated, merged, or suggested as typos of each other.
- Legitimate typos (e.g. `P181` vs `P108`, `N024` vs `N025`) must continue to provide suggestions.
- Dropdown node lists, tables, and fittings must sort deterministically and distinctly when both `N024` and `N24` are present.

---

## 3. Implementation Steps

### Step 1: Update `findNodeSuggestion` in `frontend/src/lib/client-calculator.ts` [COMPLETED]
- Implement a check to detect if `target` and `candidate` only differ by leading zeros in numeric sequences (`stripLeadingZerosInNumbers`).
- If they only differ by leading zero padding, skip the suggestion (do not treat as a typo).
- **Proof it works**: Unit test in [calculator.test.mjs](file:///d:/BackUp/programing_projects/CT%20cal/frontend/src/tests/calculator.test.mjs) passes (`findNodeSuggestion('N024', new Set(['N24']))` returns `null`, while `findNodeSuggestion('P181', new Set(['P108']))` returns `'P108'`).

### Step 2: Update `find_node_suggestion` in `backend/app/routing_engine.py` [COMPLETED]
- Added `strip_leading_zeros_in_numbers(s: str)` in Python: do not suggest candidate if it only differs by leading zero padding.
- **Proof it works**: Backend pytest in [test_routing_engine.py](file:///d:/BackUp/programing_projects/CT%20cal/backend/tests/test_routing_engine.py) passes (`find_node_suggestion("N024", {"N24"}) is None`).

### Step 3: Add Strict Fallback Tie-breakers to Node Sorting [COMPLETED]
- In [branches-table.tsx](file:///d:/BackUp/programing_projects/CT%20cal/frontend/src/components/branches-table.tsx) (`nodeOptions` sort).
- In [cables-table.tsx](file:///d:/BackUp/programing_projects/CT%20cal/frontend/src/components/cables-table.tsx) (`nodeOptions` sort).
- In [fittings-engine.ts](file:///d:/BackUp/programing_projects/CT%20cal/frontend/src/lib/fittings-engine.ts) (`calculateNetworkNodeFittings` sort).
- Supplement `{ numeric: true }` sorting with `|| a.localeCompare(b)` (lexicographical tiebreaker).
- **Proof it works**: Unit tests in [branches.test.mjs](file:///d:/BackUp/programing_projects/CT%20cal/frontend/src/tests/branches.test.mjs) verify sorting `['N24', 'N024']` produces distinct deterministic order `['N024', 'N24']`.

### Step 4: Verification & Automated Tests [COMPLETED]
- `npm test` in `frontend` (all 107 tests passing).
- `pytest` in `backend` (all 46 tests passing).
- `npm run build` in `frontend` (0 errors, build succeeds).
