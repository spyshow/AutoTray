'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { Cable, CableRoutingResult, Branch, CalculationParameters, CableCategory, CableFormation } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { lookupCatalogCableOd } from '@/lib/cable-catalog';
import { guessCableCategory, normalizeCableSpec, stripCableSpecUnits } from '@/lib/excel';
import { isSingleCorePower, getSingleCoreFormation } from '@/lib/client-calculator';
import { getStoredPageSize, setStoredPageSize } from '@/lib/page-size-storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NodeComboboxCell } from '@/components/node-combobox-cell';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Sliders,
  Route,
  GitFork,
  Info,
} from 'lucide-react';

interface EditableCellInputProps {
  value: string | number;
  onSave: (val: any) => void;
  type?: 'text' | 'number';
  step?: string;
  min?: string | number;
  className?: string;
  placeholder?: string;
}

/**
 * Focus-preserving editable cell input.
 * Keeps local state for instantaneous keystrokes without unmounting or losing focus.
 * Debounces auto-save and commits immediately on blur or Enter.
 */
function EditableCellInput({
  value: initialValue,
  onSave,
  type = 'text',
  step,
  min,
  className,
  placeholder,
}: EditableCellInputProps) {
  const [val, setVal] = useState<string | number>(initialValue ?? '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    // Only update from outside if user is not actively typing
    if (!isTypingRef.current) {
      setVal(initialValue ?? '');
    }
  }, [initialValue]);

  const commitValue = useCallback(
    (valueToCommit: string | number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      isTypingRef.current = false;
      if (valueToCommit !== initialValue) {
        if (type === 'number') {
          const num = parseFloat(String(valueToCommit));
          if (!isNaN(num)) {
            onSave(num);
          }
        } else {
          onSave(String(valueToCommit).trim());
        }
      }
    },
    [initialValue, onSave, type]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    isTypingRef.current = true;
    setVal(nextVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      commitValue(nextVal);
    }, 400);
  };

  const handleBlur = () => {
    commitValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(val);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type={type}
      step={step}
      min={min}
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}

/**
 * Detailed cable routing view rendered directly under a table row when '+' is clicked.
 * Shows the full visual route from source to destination, intermediate nodes,
 * traversed tray branch segments, levels, length, and diagnostic state.
 */
function CableRouteExpandedView({
  cable,
  route,
  branches,
}: {
  cable: Cable;
  route?: CableRoutingResult;
  branches: Branch[];
}) {
  const branchMap = useMemo(() => {
    const map = new Map<string, Branch>();
    branches.forEach(b => map.set(b.branch_id, b));
    return map;
  }, [branches]);

  const sourceNode = (cable.source_node || '').trim();
  const destNode = (cable.dest_node || '').trim();
  const sourcePanel = cable.source_panel?.trim();
  const destPanel = cable.dest_panel?.trim();

  const pathNodes = route?.path_nodes || [];
  const pathBranches = route?.path_branches || [];
  const isRouted = route?.status === 'ROUTED';
  const isLocal = route?.status === 'LOCAL';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-inner space-y-3 animate-in fade-in-50 duration-150">
      {/* Top Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-slate-900 text-xs">
                {cable.cable_tag || 'Cable'}
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-600 text-xs font-medium">
                {cable.cable_type} (OD: {cable.od_mm ?? 10} mm)
              </span>
              {cable.count > 1 && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
                  {cable.count} parallel runs
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Endpoints:</span>
              <span className="font-mono font-semibold text-slate-800">{sourceNode}</span>
              <span className="text-slate-400">➔</span>
              <span className="font-mono font-semibold text-slate-800">{destNode}</span>
              {(sourcePanel || destPanel) && (
                <span className="text-slate-400 ml-1">
                  ({sourcePanel ? `From Panel: ${sourcePanel}` : ''}
                  {sourcePanel && destPanel ? ' • ' : ''}
                  {destPanel ? `To Panel: ${destPanel}` : ''})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status & Metrics Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {isRouted ? (
            <>
              <Badge className="bg-emerald-600 text-white font-mono text-xs px-2.5 py-1 flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {route.total_length_m} m Total Length
              </Badge>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 text-xs px-2 py-0.5">
                {pathBranches.length} Tray Segments
              </Badge>
            </>
          ) : isLocal ? (
            <Badge className="bg-indigo-600 text-white font-mono text-xs px-2.5 py-1">
              Internal / Same Node (0 m)
            </Badge>
          ) : route ? (
            <Badge variant="destructive" className="text-xs px-2.5 py-1">
              Unrouted
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs text-slate-500 px-2 py-0.5">
              Calculation Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Route Flow Visualization */}
      {isRouted && pathNodes.length > 0 ? (
        <div className="space-y-3">
          {/* Breadcrumb Flow */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Network Routing Path Flow
            </span>
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 overflow-x-auto text-xs">
              {pathNodes.map((node, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === pathNodes.length - 1;
                const branchId = idx < pathBranches.length ? pathBranches[idx] : null;
                const branchObj = branchId ? branchMap.get(branchId) : null;

                return (
                  <React.Fragment key={`${node}-${idx}`}>
                    {/* Node Badge */}
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono font-bold shadow-2xs ${
                        isFirst
                          ? 'bg-blue-600 text-white border border-blue-700'
                          : isLast
                          ? 'bg-emerald-600 text-white border border-emerald-700'
                          : 'bg-white text-slate-800 border border-slate-300'
                      }`}
                      title={
                        isFirst
                          ? `Source Endpoint: ${node}${sourcePanel ? ` (Panel: ${sourcePanel})` : ''}`
                          : isLast
                          ? `Destination Endpoint: ${node}${destPanel ? ` (Panel: ${destPanel})` : ''}`
                          : `Intermediate Junction: ${node}`
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      <span>{node}</span>
                      {isFirst && <span className="text-[9px] font-sans font-normal opacity-90 ml-0.5">(Source)</span>}
                      {isLast && <span className="text-[9px] font-sans font-normal opacity-90 ml-0.5">(Dest)</span>}
                    </div>

                    {/* Connecting Branch Segment */}
                    {branchId && (
                      <div className="inline-flex items-center gap-1 text-slate-400 px-0.5">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <div
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono text-[11px]"
                          title={`Segment: ${branchId} | Level: ${branchObj?.level || 'N/A'} | Length: ${branchObj?.length_m ?? 'N/A'} m`}
                        >
                          <GitFork className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                          <span className="font-semibold">{branchId}</span>
                          {branchObj && (
                            <span className="text-[10px] text-indigo-600 font-sans">
                              ({branchObj.length_m}m • {branchObj.level})
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Tray Segments Breakdown Cards */}
          {pathBranches.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Traversed Tray Segments ({pathBranches.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {pathBranches.map((bId, bIdx) => {
                  const bObj = branchMap.get(bId);
                  const isVertical = bObj?.branch_type === 'vertical';

                  return (
                    <div
                      key={`${bId}-${bIdx}`}
                      className="p-2 rounded-md bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                          {bIdx + 1}
                        </span>
                        <div>
                          <div className="font-mono font-bold text-slate-800">{bId}</div>
                          <div className="text-[10px] text-slate-500">
                            {bObj?.level || 'Level 1'} • {isVertical ? 'Vertical Riser' : 'Horizontal Tray'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-700">
                          {bObj?.length_m ?? '-'} m
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : isLocal ? (
        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <div>
            <strong>Local Internal Run:</strong> Source and destination are located at the same node (<code className="font-bold">{sourceNode}</code>). The cable does not traverse external cable trays and has 0 m tray length.
          </div>
        </div>
      ) : route && route.status === 'UNROUTED' ? (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            Unrouted Cable: No Continuous Tray Path Found
          </div>
          <p className="text-rose-700">
            {route.unrouted_reason || `Could not find a valid tray path from node "${sourceNode}" to "${destNode}". Verify that branches connecting these nodes exist and elevation risers connect any different levels.`}
          </p>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span>
            Route path will be calculated automatically when you click <strong>Run Sizing Calculation</strong> in the top header.
          </span>
        </div>
      )}
    </div>
  );
}

interface CablesTableProps {
  cables: Cable[];
  branches: Branch[];
  routingResults: CableRoutingResult[];
  onUpdateCable: (index: number, updated: Cable) => void;
  onAddCable: (cable: Cable) => void;
  onDeleteCable: (index: number) => void;
  onDeleteMultipleCables?: (indices: number[]) => void;
  onDeleteAllCables?: () => void;
  parameters?: CalculationParameters;
  onOpenMissingSpecModal?: (spec?: string) => void;
}

export function CablesTable({
  cables,
  branches,
  routingResults,
  onUpdateCable,
  onAddCable,
  onDeleteCable,
  onDeleteMultipleCables,
  onDeleteAllCables,
  parameters,
  onOpenMissingSpecModal,
}: CablesTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  // Restore saved page size preference from localStorage
  useEffect(() => {
    const saved = getStoredPageSize('cables');
    if (saved && saved !== pagination.pageSize) {
      setPagination(prev => ({ ...prev, pageSize: saved }));
    }
  }, []);

  // Reset page when search or type filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [globalFilter, typeFilter]);

  // Stable references to prevent columns useMemo recreation on every single keystroke
  const cablesRef = useRef(cables);
  cablesRef.current = cables;

  const parametersRef = useRef(parameters);
  parametersRef.current = parameters;

  const onUpdateCableRef = useRef(onUpdateCable);
  onUpdateCableRef.current = onUpdateCable;

  const onDeleteCableRef = useRef(onDeleteCable);
  onDeleteCableRef.current = onDeleteCable;

  // Measure sticky header and toolbar offsets dynamically
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [headerOffset, setHeaderOffset] = useState(57);
  const [toolbarHeight, setToolbarHeight] = useState(56);

  useEffect(() => {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;
    const updateOffset = () => {
      setHeaderOffset(headerEl.offsetHeight);
    };
    updateOffset();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateOffset);
      ro.observe(headerEl);
      return () => ro.disconnect();
    }
  }, []);

  useEffect(() => {
    if (!toolbarRef.current) return;
    const updateToolbar = () => {
      if (toolbarRef.current) {
        setToolbarHeight(toolbarRef.current.offsetHeight);
      }
    };
    updateToolbar();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateToolbar);
      ro.observe(toolbarRef.current);
      return () => ro.disconnect();
    }
  }, []);

  // Clean up selected indices when cable count shrinks
  useEffect(() => {
    setSelectedIndices(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < cables.length) next.add(i);
      });
      return next;
    });
  }, [cables.length]);

  // Collect valid graph nodes from branches
  const validNodesSet = useMemo(() => {
    const s = new Set<string>();
    branches.forEach(b => {
      s.add(b.node_from.trim());
      s.add(b.node_to.trim());
    });
    return s;
  }, [branches]);

  const validNodesSetRef = useRef(validNodesSet);
  validNodesSetRef.current = validNodesSet;

  // Extract all unique node names from both branches and cables
  const nodeOptions = useMemo(() => {
    const s = new Set<string>();
    branches.forEach(b => {
      if (b.node_from?.trim()) s.add(b.node_from.trim());
      if (b.node_to?.trim()) s.add(b.node_to.trim());
    });
    cables.forEach(c => {
      if (c.source_node?.trim()) s.add(c.source_node.trim());
      if (c.dest_node?.trim()) s.add(c.dest_node.trim());
    });
    return Array.from(s).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) || a.localeCompare(b)
    );
  }, [branches, cables]);

  const nodeOptionsRef = useRef(nodeOptions);
  nodeOptionsRef.current = nodeOptions;

  // Global device -> panel lookup registry computed across all cables
  const devicePanelMap = useMemo(() => {
    const map = new Map<string, string>();

    // Pass 1: Direct cable source_panel / dest_panel properties
    cables.forEach(c => {
      const s = c.source_node?.trim() || '';
      const d = c.dest_node?.trim() || '';
      const sp = c.source_panel?.trim() || '';
      const dp = c.dest_panel?.trim() || '';

      if (sp && s && s !== sp) {
        map.set(s, sp);
      }
      if (dp && d && d !== dp) {
        map.set(d, dp);
      }
    });

    // Pass 2: Inferred connections where one end is a panel and other end is a device
    cables.forEach(c => {
      const s = c.source_node?.trim() || '';
      const d = c.dest_node?.trim() || '';
      const isFieldDev = (name: string) => /^(?:E|CBE)[\-_]/i.test(name);
      const isPanel = (name: string) => !isFieldDev(name) && Boolean(name);

      if (isPanel(s) && isFieldDev(d) && !map.has(d)) {
        map.set(d, s);
      } else if (isPanel(d) && isFieldDev(s) && !map.has(s)) {
        map.set(s, d);
      }
    });

    // Pass 3: Transitive propagation (e.g. E-93D1 -> E-93P2)
    cables.forEach(c => {
      const s = c.source_node?.trim() || '';
      const d = c.dest_node?.trim() || '';
      if (map.has(s) && !map.has(d) && /^(?:E|CBE)[\-_]/i.test(d)) {
        map.set(d, map.get(s)!);
      } else if (map.has(d) && !map.has(s) && /^(?:E|CBE)[\-_]/i.test(s)) {
        map.set(s, map.get(d)!);
      }
    });

    return map;
  }, [cables]);

  const devicePanelMapRef = useRef(devicePanelMap);
  devicePanelMapRef.current = devicePanelMap;

  // Track duplicate cable tags across the schedule
  const duplicateTagsSet = useMemo(() => {
    const counts = new Map<string, number>();
    cables.forEach(c => {
      const tag = c.cable_tag?.trim() || '';
      if (tag) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    });
    const dups = new Set<string>();
    counts.forEach((cnt, tag) => {
      if (cnt > 1) dups.add(tag);
    });
    return dups;
  }, [cables]);

  const duplicateTagsSetRef = useRef(duplicateTagsSet);
  duplicateTagsSetRef.current = duplicateTagsSet;

  const routingResultsRef = useRef(routingResults);
  routingResultsRef.current = routingResults;

  // Map routing status by composite key (tag + endpoints) and fallback tag
  const routeMap = useMemo(() => {
    const map = new Map<string, CableRoutingResult>();
    routingResults.forEach(r => {
      const s = (r.source_node || '').trim();
      const d = (r.dest_node || '').trim();
      // Composite key to prevent collisions when multiple cables share the same tag
      map.set(`${r.cable_tag}:::${s}:::${d}`, r);
      // Fallback tag key: only store if not already set (keep first occurrence)
      if (!map.has(r.cable_tag)) {
        map.set(r.cable_tag, r);
      }
    });
    return map;
  }, [routingResults]);

  const routeMapRef = useRef(routeMap);
  routeMapRef.current = routeMap;

  const getCableRoute = useCallback(
    (cable: Cable, originalIdx: number): CableRoutingResult | undefined => {
      const results = routingResultsRef.current;
      let route: CableRoutingResult | undefined;

      // 1. Direct index match (1:1 alignment with cables array)
      if (originalIdx >= 0 && originalIdx < results.length) {
        const candidate = results[originalIdx];
        if (candidate && candidate.cable_tag === cable.cable_tag) {
          route = candidate;
        }
      }

      // 2. Composite key match (tag + source_node + dest_node)
      if (!route) {
        const s = (cable.source_node || '').trim();
        const d = (cable.dest_node || '').trim();
        route = routeMapRef.current.get(`${cable.cable_tag}:::${s}:::${d}`);
      }

      // 3. Fallback to tag match
      if (!route) {
        route = routeMapRef.current.get(cable.cable_tag);
      }

      return route;
    },
    []
  );

  const filteredCables = useMemo(() => {
    return cables.filter(c => {
      const cat = (c.category || guessCableCategory(c.cable_type)).toLowerCase();
      if (typeFilter !== 'ALL' && cat !== typeFilter.toLowerCase()) {
        return false;
      }
      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      const sPanel = c.source_panel || devicePanelMap.get(c.source_node.trim());
      const dPanel = c.dest_panel || devicePanelMap.get(c.dest_node.trim());
      return (
        c.cable_tag.toLowerCase().includes(q) ||
        c.source_node.toLowerCase().includes(q) ||
        c.dest_node.toLowerCase().includes(q) ||
        c.cable_type.toLowerCase().includes(q) ||
        cat.includes(q) ||
        (sPanel && sPanel.toLowerCase().includes(q)) ||
        (dPanel && dPanel.toLowerCase().includes(q))
      );
    });
  }, [cables, typeFilter, globalFilter, devicePanelMap]);

  // Guard against out-of-range page index when rows are deleted
  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(filteredCables.length / pagination.pageSize) - 1);
    if (pagination.pageIndex > maxPageIndex) {
      setPagination(prev => ({ ...prev, pageIndex: maxPageIndex }));
    }
  }, [filteredCables.length, pagination.pageSize, pagination.pageIndex]);

  const isAllFilteredSelected =
    filteredCables.length > 0 &&
    filteredCables.every(c => selectedIndices.has(cables.indexOf(c)));
  const isSomeFilteredSelected =
    filteredCables.some(c => selectedIndices.has(cables.indexOf(c))) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIndices);
    if (isAllFilteredSelected) {
      filteredCables.forEach(c => {
        const idx = cablesRef.current.indexOf(c);
        if (idx !== -1) next.delete(idx);
      });
    } else {
      filteredCables.forEach(c => {
        const idx = cablesRef.current.indexOf(c);
        if (idx !== -1) next.add(idx);
      });
    }
    setSelectedIndices(next);
  };

  const handleAddNew = () => {
    const newIdx = cablesRef.current.length + 1;
    const firstBranch = branches[0];
    onAddCable({
      cable_tag: `C_NEW_${newIdx}`,
      source_node: firstBranch ? firstBranch.node_from : 'MCC_L1',
      dest_node: firstBranch ? firstBranch.node_to : 'PANEL_01',
      cable_type: '4x1.5 mm²',
      category: 'power',
      od_mm: 10.3,
      count: 1,
    });

    // Keep user on the same page, or advance to the new page if on the last page and it was full
    const currentTotal = filteredCables.length;
    const isAtLastPage = pagination.pageIndex === Math.max(0, Math.ceil(currentTotal / pagination.pageSize) - 1);
    if (isAtLastPage && currentTotal % pagination.pageSize === 0 && currentTotal > 0) {
      setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
    }
  };

  const columns = useMemo<ColumnDef<Cable>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <div className="flex items-center justify-center px-1">
            <input
              type="checkbox"
              checked={isAllFilteredSelected}
              ref={el => {
                if (el) el.indeterminate = isSomeFilteredSelected;
              }}
              onChange={handleToggleSelectAll}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              title="Select all filtered cables"
            />
          </div>
        ),
        cell: ({ row }) => {
          const originalIdx = cablesRef.current.indexOf(row.original);
          const isSelected = selectedIndices.has(originalIdx);
          return (
            <div className="flex items-center justify-center px-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  const next = new Set(selectedIndices);
                  if (isSelected) {
                    next.delete(originalIdx);
                  } else {
                    next.add(originalIdx);
                  }
                  setSelectedIndices(next);
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          );
        },
      },
      {
        accessorKey: 'cable_tag',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 hover:bg-transparent font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Cable Tag
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const rawTag = (row.original.cable_tag || '').trim();
          const isDuplicate = Boolean(rawTag) && duplicateTagsSetRef.current.has(rawTag);
          const isExpanded = expandedRowIds.has(row.id);

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleRowExpansion(row.id);
                  }}
                  className={`h-5 w-5 rounded flex items-center justify-center transition-colors border shrink-0 ${
                    isExpanded
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                  }`}
                  title={isExpanded ? 'Hide cable route' : 'Show cable route'}
                >
                  {isExpanded ? <Minus className="h-3 w-3 stroke-[2.5]" /> : <Plus className="h-3 w-3 stroke-[2.5]" />}
                </button>
                <EditableCellInput
                  value={row.original.cable_tag}
                  onSave={newTag => {
                    const idx = cablesRef.current.indexOf(row.original);
                    if (idx !== -1) {
                      onUpdateCableRef.current(idx, { ...row.original, cable_tag: newTag });
                    }
                  }}
                  className="font-mono text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none w-28"
                />
              </div>
              {isDuplicate && (
                <div
                  className="flex items-center gap-1 pl-6.5"
                  title={`Tag '${rawTag}' appears multiple times in schedule. Routing is disambiguated by row and endpoints.`}
                >
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300/80 font-mono text-[9px] font-semibold">
                    ⚠️ Duplicate Tag
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'source_node',
        header: 'Source (From Node)',
        cell: ({ row }) => {
          const sNode = row.original.source_node.trim();
          const isInvalid = !validNodesSetRef.current.has(sNode);
          const parentPanel = row.original.source_panel || devicePanelMapRef.current.get(sNode);
          const isExternalDevice = /^(?:E|CBE)[\-_]/i.test(sNode) || (Boolean(parentPanel) && parentPanel !== sNode);

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <NodeComboboxCell
                  value={row.original.source_node}
                  options={nodeOptionsRef.current}
                  onSave={newSrc => {
                    const idx = cablesRef.current.indexOf(row.original);
                    if (idx !== -1) {
                      onUpdateCableRef.current(idx, { ...row.original, source_node: newSrc });
                    }
                  }}
                  isInvalid={isInvalid}
                  placeholder="Source Node..."
                  widthClass="w-36"
                />
                {isInvalid && (
                  <span
                    title={
                      parentPanel && parentPanel !== sNode
                        ? `Source node '${sNode}' not found in any branch segment! (External device belonging to panel: ${parentPanel})`
                        : 'Source node not found in any branch segment!'
                    }
                    className="text-red-500 cursor-help flex-shrink-0"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              {isExternalDevice && parentPanel && parentPanel !== sNode && (
                <div
                  className="flex items-center gap-1 pl-0.5"
                  title={`Field device belongs to panel: ${parentPanel}`}
                >
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/80 font-mono text-[9px] font-bold">
                    Panel: {parentPanel}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'dest_node',
        header: 'Destination (To Node)',
        cell: ({ row }) => {
          const dNode = row.original.dest_node.trim();
          const isInvalid = !validNodesSetRef.current.has(dNode);
          const parentPanel = row.original.dest_panel || devicePanelMapRef.current.get(dNode);
          const isExternalDevice = /^(?:E|CBE)[\-_]/i.test(dNode) || (Boolean(parentPanel) && parentPanel !== dNode);

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <NodeComboboxCell
                  value={row.original.dest_node}
                  options={nodeOptionsRef.current}
                  onSave={newDst => {
                    const idx = cablesRef.current.indexOf(row.original);
                    if (idx !== -1) {
                      onUpdateCableRef.current(idx, { ...row.original, dest_node: newDst });
                    }
                  }}
                  isInvalid={isInvalid}
                  placeholder="Dest Node..."
                  widthClass="w-36"
                />
                {isInvalid && (
                  <span
                    title={
                      parentPanel && parentPanel !== dNode
                        ? `Destination node '${dNode}' not found in any branch segment! (External device belonging to panel: ${parentPanel})`
                        : 'Destination node not found in any branch segment!'
                    }
                    className="text-red-500 cursor-help flex-shrink-0"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              {isExternalDevice && parentPanel && parentPanel !== dNode && (
                <div
                  className="flex items-center gap-1 pl-0.5"
                  title={`Field device belongs to panel: ${parentPanel}`}
                >
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/80 font-mono text-[9px] font-bold">
                    Panel: {parentPanel}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'cable_type',
        header: () => (
          <div>
            <div className="font-bold text-slate-800">Cable Spec / Type</div>
            <div className="text-[10px] text-slate-400 font-normal">e.g. 4x1.5, 4x50, Cat6A</div>
          </div>
        ),
        cell: ({ row }) => {
          const rawSpec = String(row.original.cable_type || '').trim();
          const spec = normalizeCableSpec(rawSpec) || rawSpec;
          const cleanSpec = stripCableSpecUnits(spec);
          const catalogOd = lookupCatalogCableOd(cleanSpec) || lookupCatalogCableOd(spec) || lookupCatalogCableOd(rawSpec);
          const isCatalogMatched = catalogOd !== null && catalogOd > 0;
          const customRules = parametersRef.current?.custom_od_by_type || {};
          const customOd =
            customRules[cleanSpec] ||
            customRules[spec] ||
            customRules[rawSpec] ||
            Object.entries(customRules).find(
              ([k]) => stripCableSpecUnits(k).toLowerCase() === cleanSpec.toLowerCase()
            )?.[1];
          const hasCustomRule = customOd !== undefined && customOd > 0;
          const isCrossSection = /(?:^|[^\d])\d+\s*(?:[xX*×Gg\/])\s*[\d\.]+/i.test(row.original.cable_type || '');

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <EditableCellInput
                  value={row.original.cable_type}
                  placeholder="e.g. 4x1.5"
                  onSave={newType => {
                    const idx = cablesRef.current.indexOf(row.original);
                    if (idx !== -1) {
                      const trimmed = String(newType).trim();
                      const normalized = normalizeCableSpec(trimmed) || trimmed;
                      const cleanNorm = stripCableSpecUnits(normalized);
                      const catOd = lookupCatalogCableOd(cleanNorm) || lookupCatalogCableOd(normalized);
                      const rules = parametersRef.current?.custom_od_by_type || {};
                      const custOd =
                        rules[cleanNorm] ||
                        rules[normalized] ||
                        Object.entries(rules).find(
                          ([k]) => stripCableSpecUnits(k).toLowerCase() === cleanNorm.toLowerCase()
                        )?.[1];
                      const autoOd = (custOd && custOd > 0) ? custOd : (catOd && catOd > 0 ? catOd : undefined);
                      const guessedCat = guessCableCategory(cleanNorm);
                      onUpdateCableRef.current(idx, {
                        ...row.original,
                        cable_type: cleanNorm,
                        category: row.original.category || guessedCat,
                        ...(autoOd !== undefined ? { od_mm: autoOd } : {}),
                      });
                    }
                  }}
                  className="font-mono text-xs font-semibold text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-1.5 py-0.5 rounded outline-none w-24 shadow-xs"
                />
                {isCrossSection && (
                  <span className="text-[11px] font-semibold text-slate-400 select-none">
                    mm²
                  </span>
                )}
              </div>
              {isCatalogMatched ? (
                <div className="flex items-center gap-1 text-[9px] text-blue-600 font-medium">
                  <Sparkles className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                  <span>Handbook: {catalogOd} mm</span>
                </div>
              ) : hasCustomRule ? (
                <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-medium">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                  <span>Rule: {customOd} mm</span>
                </div>
              ) : cleanSpec ? (
                <button
                  type="button"
                  onClick={() => onOpenMissingSpecModal?.(cleanSpec)}
                  className="inline-flex items-center gap-1 text-[9px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-1 py-0.5 rounded font-medium transition cursor-pointer"
                  title="Click to enter Outer Diameter for this spec in the Rules Modal"
                >
                  <AlertCircle className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                  <span>+ Set OD in Rules</span>
                </button>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const currentCat: CableCategory = row.original.category || guessCableCategory(row.original.cable_type);
          return (
            <select
              value={currentCat}
              onChange={e => {
                const idx = cablesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateCableRef.current(idx, {
                    ...row.original,
                    category: e.target.value as CableCategory,
                  });
                }
              }}
              className={`text-xs rounded font-medium px-2 py-0.5 border cursor-pointer capitalize transition ${
                currentCat === 'power'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : currentCat === 'control'
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : currentCat === 'signal'
                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                  : currentCat === 'data'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              <option value="power">Power</option>
              <option value="control">Control</option>
              <option value="signal">Signal</option>
              <option value="data">Data</option>
              <option value="bus">Bus</option>
            </select>
          );
        },
      },
      {
        id: 'formation',
        header: () => (
          <div>
            <div className="font-bold text-slate-800">Formation</div>
            <div className="text-[10px] text-slate-400 font-normal">1-Core Method</div>
          </div>
        ),
        cell: ({ row }) => {
          const currentCat: CableCategory = row.original.category || guessCableCategory(row.original.cable_type);
          const is1C = isSingleCorePower(row.original);

          if (currentCat !== 'power') {
            return <span className="text-[11px] text-slate-400 italic">Multilayer</span>;
          }

          if (!is1C) {
            return <span className="text-[11px] text-slate-500 font-medium">Spaced (2&times;OD)</span>;
          }

          const currentFormation = getSingleCoreFormation(row.original, parametersRef.current?.single_core_power_formation);

          return (
            <select
              value={row.original.formation || ''}
              onChange={e => {
                const idx = cablesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateCableRef.current(idx, {
                    ...row.original,
                    formation: (e.target.value || undefined) as CableFormation | undefined,
                  });
                }
              }}
              className={`text-xs rounded font-medium px-2 py-0.5 border cursor-pointer transition ${
                currentFormation === 'trefoil'
                  ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold'
                  : currentFormation === 'flat_touching'
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
              title="1-Core installation method on tray"
            >
              <option value="">
                Default ({currentFormation === 'trefoil' ? 'Trefoil Δ' : currentFormation === 'flat_touching' ? 'Flat Touching' : 'Flat Spaced'})
              </option>
              <option value="trefoil">Trefoil (Trifoly Δ)</option>
              <option value="flat_touching">Flat Touching (Near)</option>
              <option value="flat_spaced">Flat Spaced (1×OD)</option>
            </select>
          );
        },
      },
      {
        accessorKey: 'od_mm',
        header: () => (
          <div className="text-right">
            <div className="font-bold text-slate-800">OD (mm)</div>
            <div className="text-[10px] text-slate-400 font-normal">Outer Dia</div>
          </div>
        ),
        cell: ({ row }) => {
          return (
            <EditableCellInput
              type="number"
              step="0.1"
              min="0.5"
              value={row.original.od_mm ?? ''}
              onSave={newOd => {
                const idx = cablesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateCableRef.current(idx, {
                    ...row.original,
                    od_mm: parseFloat(String(newOd)) || 10,
                  });
                }
              }}
              className="font-mono text-xs font-bold text-blue-700 text-right border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1 py-0.5 rounded w-16 outline-none"
            />
          );
        },
      },
      {
        accessorKey: 'count',
        header: () => (
          <div className="text-right" title="Parallel Cable Runs (Count of identical cables running together, NOT conductor cores). Default: 1">
            <div className="font-bold text-slate-800">Parallel Runs</div>
            <div className="text-[10px] text-slate-400 font-normal">Qty (Default: 1)</div>
          </div>
        ),
        cell: ({ row }) => {
          return (
            <div title="Parallel cable runs (count)">
              <EditableCellInput
                type="number"
                min="1"
                step="1"
                value={row.original.count ?? 1}
                onSave={newCount => {
                  const idx = cablesRef.current.indexOf(row.original);
                  if (idx !== -1) {
                    onUpdateCableRef.current(idx, {
                      ...row.original,
                      count: Math.max(1, parseInt(String(newCount), 10) || 1),
                    });
                  }
                }}
                className="font-mono text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1 py-0.5 rounded w-14 outline-none"
              />
            </div>
          );
        },
      },
      {
        id: 'routing_status',
        header: 'Route Status',
        cell: ({ row }) => {
          const originalIdx = cablesRef.current.indexOf(row.original);
          const route = getCableRoute(row.original, originalIdx);

          if (!route) {
            return <Badge variant="secondary" className="text-[10px]">Uncalculated</Badge>;
          }
          if (route.status === 'ROUTED') {
            return (
              <div className="space-y-0.5">
                <Badge variant="success" className="text-[10px] gap-1 font-mono">
                  <CheckCircle2 className="h-3 w-3" /> {route.total_length_m} m
                </Badge>
                <div className="text-[9px] text-slate-500 truncate max-w-[140px]" title={route.path_branches?.join(' ➔ ')}>
                  {route.path_branches?.length} segments
                </div>
              </div>
            );
          }
          if (route.status === 'LOCAL') {
            return (
              <div className="space-y-0.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-slate-100 text-slate-700 border-slate-300 font-medium cursor-help"
                  title={route.unrouted_reason || 'Local internal cable'}
                >
                  Local ({row.original.source_node})
                </Badge>
                <div className="text-[9px] text-slate-500">Internal (0 m)</div>
              </div>
            );
          }
          return (
            <div className="space-y-0.5">
              <Badge variant="destructive" className="text-[10px] cursor-help" title={route.unrouted_reason || ''}>
                Unrouted
              </Badge>
              {route.unrouted_reason && (
                <div className="text-[9px] text-red-600 font-medium truncate max-w-[150px] cursor-help" title={route.unrouted_reason}>
                  {route.unrouted_reason}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const idx = cablesRef.current.indexOf(row.original);
                if (idx !== -1) onDeleteCableRef.current(idx);
              }}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
              title="Delete Cable"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    // Recompute columns when selection or row expansion changes (does not recompute on typing!)
    [selectedIndices, isAllFilteredSelected, isSomeFilteredSelected, expandedRowIds, toggleRowExpansion, getCableRoute]
  );

  const table = useReactTable({
    data: filteredCables,
    columns,
    getRowId: (row, index) => `${row.cable_tag || 'cable'}_${index}`,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const missingSpecsCount = useMemo(() => {
    const customRules = parameters?.custom_od_by_type || {};
    const unconfigured = new Set<string>();
    cables.forEach(c => {
      const rawSpec = String(c.cable_type || '').trim();
      if (!rawSpec) return;
      const spec = normalizeCableSpec(rawSpec) || rawSpec;
      const cleanSpec = stripCableSpecUnits(spec);
      const hasRule = Boolean(
        customRules[cleanSpec] ||
        customRules[spec] ||
        customRules[rawSpec] ||
        Object.entries(customRules).find(
          ([k]) => stripCableSpecUnits(k).toLowerCase() === cleanSpec.toLowerCase()
        )
      );
      if (!hasRule && !lookupCatalogCableOd(cleanSpec) && !lookupCatalogCableOd(spec) && !lookupCatalogCableOd(rawSpec)) {
        unconfigured.add(cleanSpec);
      }
    });
    return unconfigured.size;
  }, [cables, parameters]);

  return (
    <div className="space-y-4">
      {/* Alert Banner for Missing Cable Specs in Rules */}
      {missingSpecsCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">{missingSpecsCount} cable specification{missingSpecsCount > 1 ? 's' : ''}</span> in your schedule {missingSpecsCount > 1 ? 'are' : 'is'} not defined in project rules or catalog.
              <span className="text-amber-700 ml-1">Enter their outer diameters to ensure precise tray sizing.</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onOpenMissingSpecModal?.()}
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shrink-0 shadow-xs"
          >
            <Sliders className="h-3.5 w-3.5" />
            Enter OD for Missing Specs
          </Button>
        </div>
      )}

      {/* TanStack Cables Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Top Action Toolbar - Sticky right under App Header */}
        <div
          ref={toolbarRef}
          style={{ top: `${headerOffset}px` }}
          className="sticky z-20 bg-white/95 backdrop-blur-sm rounded-t-xl border-b border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-[top] duration-75"
        >
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search tag, node, type..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="pl-8 text-xs h-9 bg-white"
              />
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {['ALL', 'power', 'control', 'signal', 'data'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium capitalize transition ${
                    typeFilter === type
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {missingSpecsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenMissingSpecModal?.()}
                className="text-xs h-9 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold gap-1.5"
                title="Enter Outer Diameter for unrecognized cable specifications"
              >
                <Sliders className="h-3.5 w-3.5 text-amber-600" />
                Missing ODs ({missingSpecsCount})
              </Button>
            )}
            {selectedIndices.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${selectedIndices.size} selected cable(s)?`)) {
                    if (onDeleteMultipleCables) {
                      onDeleteMultipleCables(Array.from(selectedIndices));
                    } else {
                      const sorted = Array.from(selectedIndices).sort((a, b) => b - a);
                      sorted.forEach(idx => onDeleteCable(idx));
                    }
                    setSelectedIndices(new Set());
                  }
                }}
                className="text-xs h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected ({selectedIndices.size})
              </Button>
            )}

            {cables.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete all ${cables.length} cables from this project?`)) {
                    if (onDeleteAllCables) {
                      onDeleteAllCables();
                    } else if (onDeleteMultipleCables) {
                      onDeleteMultipleCables(cables.map((_, i) => i));
                    }
                    setSelectedIndices(new Set());
                  }
                }}
                className="text-xs h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold gap-1.5"
                title="Delete all cables in this project"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete All
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 shadow-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Cable
            </Button>
          </div>
        </div>

        {/* TanStack Cables Table */}
        <Table containerClassName="overflow-x-auto md:overflow-visible">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="bg-slate-100 hover:bg-slate-100 border-b border-slate-200">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ top: `${headerOffset + toolbarHeight}px` }}
                    className="sticky z-10 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 py-3 shadow-xs transition-[top] duration-75"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => {
                const originalIdx = cablesRef.current.indexOf(row.original);
                const isSelected = selectedIndices.has(originalIdx);
                const isExpanded = expandedRowIds.has(row.id);
                const route = getCableRoute(row.original, originalIdx);
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={
                        isSelected
                          ? 'bg-blue-50/70 hover:bg-blue-50/90'
                          : isExpanded
                          ? 'bg-blue-50/30 border-b-0'
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="text-xs py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b-2 border-slate-200">
                        <TableCell colSpan={columns.length} className="p-3">
                          <CableRouteExpandedView
                            cable={row.original}
                            route={route}
                            branches={branches}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No cable entries found matching filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 bg-slate-50 text-xs rounded-b-xl">
          <div className="flex flex-wrap items-center gap-3 text-slate-500">
            <span>Showing {table.getRowModel().rows.length} of {filteredCables.length} cables</span>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span>Lines per page:</span>
              <select
                value={pagination.pageSize}
                onChange={e => {
                  const newSize = Number(e.target.value);
                  setStoredPageSize(newSize, 'cables');
                  setPagination({ pageIndex: 0, pageSize: newSize });
                }}
                className="h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-3 text-xs"
            >
              Previous
            </Button>
            <span className="text-slate-600 font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {Math.max(1, table.getPageCount())}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
