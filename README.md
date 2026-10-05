# AutoTray-Router: Industrial Cable Tray & Multi-Level Riser Sizing Engine

**AutoTray-Router** is an industrial-grade engineering application designed for electrical engineers, EPC contractors, and plant designers to model 3D multi-level cable tray routing, automate Dijkstra shortest-path cable assignments across elevation risers, and calculate commercial tray sizing compliant with **NEC 392** and **IEC 61537** standards.

---

## 1. System Architecture

```
                          ┌────────────────────────────────┐
                          │   Next.js 16 (React 19) App    │
                          │ - Dynamic SheetJS Column Map   │
                          │ - TanStack Table v8 Datagrids  │
                          │ - Multi-Level Plant Schematic  │
                          └───────────────┬────────────────┘
                                          │
                                   HTTP / REST JSON
                                          │
                                          ▼
                          ┌────────────────────────────────┐
                          │     FastAPI Python Backend     │
                          │ - NetworkX Weighted Graph      │
                          │ - Multi-Level Dijkstra Routing │
                          │ - Pydantic v2 Validation       │
                          │ - OpenPyXL Formatted Exporter  │
                          └────────────────────────────────┘
```

### Backend (`/backend`)
- **FastAPI**: REST endpoints for sizing computation, diagnostics, and binary report generation.
- **NetworkX**: Undirected weighted graph modeling (`G = nx.Graph()`), where branches and vertical risers represent edges with length and tray side height attributes.
- **Pydantic v2**: High-performance validation schemas for parameters, cables, branches, and responses.
- **OpenPyXL**: Generates formatted, multi-tab Excel workbooks with colored headers, cell borders, KPI blocks, and auto-adjusted column dimensions.

### Frontend (`/frontend`)
- **Next.js 16 (App Router) + React 19 + TypeScript**: Modern client-side architecture.
- **Tailwind CSS + Shadcn UI (Radix UI) + Lucide Icons**: Industrial UI theme.
- **TanStack Table v8**: Editable, sortable, searchable tables with expandable sub-rows and pagination.
- **SheetJS (`xlsx`)**: Browser-side Excel parsing, 5-row live preview, and intelligent fuzzy column matching.

---

## 2. Electrical & Sizing Engineering Formulas

### Standard Commercial Widths
Trays are sized to the next available standard width:
$$\text{Widths} \in [100, 150, 200, 300, 400, 450, 500, 600, 750, 900]\text{ mm}$$
If required width $> 900\text{ mm}$, the segment is flagged as `OVERFILL_SPLIT_TIER` (demanding multi-tier or parallel trays).

### Power Cables (Single Layer with Spacing)
Per standard practice to prevent thermal ampacity derating, adjacent power cables maintain one cable diameter spacing ($2 \times \text{OD}$):
$$\text{Width}_{\text{power}} = \sum (\text{OD}_i \times 2) \times \text{Count}_i$$

### Control & Signal Cables (Multilayer Packing by Area)
Multiconductor control cables are stacked within the tray cross-section up to the maximum permitted fill factor (default 40%):
$$\text{Area}_{\text{control}} = \sum \left(\frac{\pi \cdot \text{OD}_i^2}{4}\right) \times \text{Count}_i$$
$$\text{Width}_{\text{control}} = \frac{\text{Area}_{\text{control}}}{\text{Tray Height} \times (\text{Fill Factor} / 100)}$$

### Data / Fieldbus Cables
Calculated similarly or segregated. If a metallic barrier is enabled, a separator width (e.g. 15 mm) is automatically inserted between power and control compartments:
$$\text{Width}_{\text{req}} = (\text{Width}_{\text{power}} + \text{Width}_{\text{control}} + \text{Width}_{\text{data}} + \text{Barrier}) \times (1 + \text{Spare Margin})$$

---

## 3. Quickstart & Installation

### One-Command Start (Windows)

To launch both the backend and frontend simultaneously with a single command:

**Option A (Command Prompt / Double Click):**
```cmd
start.bat
```

**Option B (PowerShell):**
```powershell
.\start.ps1
```

The script will automatically:
1. Check the Python environment and install any missing requirements.
2. Check the Node.js environment and install frontend packages.
3. Start the FastAPI backend server on port 8000.
4. Start the Next.js 16 frontend on port 3000.
5. Launch your default web browser to [http://localhost:3000](http://localhost:3000).

---

### Manual Setup

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

Run tests:
```bash
python run_tests.py
# or with pytest:
pytest tests/
```

### Frontend Setup (Node.js 20+)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

Run tests:
```bash
npm test
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health status check |
| `POST` | `/api/v1/calculate-sizing` | Executes graph routing and returns branch sizing & cable schedules |
| `POST` | `/api/v1/export-excel` | Generates a 4-tab styled `.xlsx` workbook from sizing results |
| `GET` | `/api/v1/sample-template` | Streams a pre-populated sample workbook for immediate testing |

---

## 5. Key Features

1. **Smart Excel Upload & Dynamic Column Mapper**:
   - Upload any custom `.xlsx`, `.xls`, or `.csv` file.
   - Live 5-row preview of any selected sheet.
   - Fuzzy auto-detection of column headers (`cable_tag`, `source_node`, `dest_node`, `od_mm`, `branch_id`, `length_m`, etc.).
   - Interactive type normalization mapping arbitrary strings (e.g., "400V Feeder", "TH-COUPLE", "PROFINET") into standard calculation categories.

2. **TanStack Table v8 Datagrids**:
   - Inline editing for all cable and branch parameters.
   - Validation warning badges highlighting missing nodes not present in the physical branch network.
   - Expandable branch rows revealing all cables traversing that specific segment with individual width contributions.

3. **Multi-Level Plant Topology & Visual Schematic**:
   - Interactive 2D elevation schematic illustrating horizontal trays on Level 1, Level 2, Level 3, and vertical riser transitions.
   - Color coding based on tray fill ratio (Green < 70%, Amber 70–90%, Red > 90%).
   - Click-to-inspect segment drawer.
