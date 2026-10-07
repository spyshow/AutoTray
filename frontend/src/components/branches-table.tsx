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
import { Branch, Cable, SupportMountingType } from '@/lib/types';
import { incrementIdentifier } from '@/lib/utils';
import { getStoredPageSize, setStoredPageSize } from '@/lib/page-size-storage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NodeComboboxCell } from '@/components/node-combobox-cell';
import {
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  MoveVertical,
  MoveHorizontal,
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
 * Focus-preserving editable cell input for Branches & Risers.
 * Keeps local state for instantaneous keystrokes without unmounting or losing focus.
 * Debounces auto-save (400ms) and commits immediately on blur or Enter.
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

interface BranchesTableProps {
  branches: Branch[];
  cables?: Cable[];
  defaultTrayHeight: number;
  defaultMountingType?: SupportMountingType;
  onUpdateBranch: (index: number, updated: Branch) => void;
  onAddBranch: (branch: Branch) => void;
  onDeleteBranch: (index: number) => void;
  onDeleteMultipleBranches?: (indices: number[]) => void;
  onDeleteAllBranches?: () => void;
}

export function BranchesTable({
  branches,
  cables = [],
  defaultTrayHeight,
  defaultMountingType = 'ceiling_trapeze',
  onUpdateBranch,
  onAddBranch,
  onDeleteBranch,
  onDeleteMultipleBranches,
  onDeleteAllBranches,
}: BranchesTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Restore saved page size preference from localStorage
  useEffect(() => {
    const saved = getStoredPageSize('branches');
    if (saved && saved !== pagination.pageSize) {
      setPagination(prev => ({ ...prev, pageSize: saved }));
    }
  }, []);

  // Reset page when search or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [globalFilter, levelFilter, typeFilter]);

  // Stable references to prevent columns useMemo recreation on every keystroke
  const branchesRef = useRef(branches);
  branchesRef.current = branches;

  const onUpdateBranchRef = useRef(onUpdateBranch);
  onUpdateBranchRef.current = onUpdateBranch;

  const onDeleteBranchRef = useRef(onDeleteBranch);
  onDeleteBranchRef.current = onDeleteBranch;

  const defaultTrayHeightRef = useRef(defaultTrayHeight);
  defaultTrayHeightRef.current = defaultTrayHeight;

  const defaultMountingTypeRef = useRef(defaultMountingType);
  defaultMountingTypeRef.current = defaultMountingType;

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

  // Clean up selected indices when branch count shrinks
  useEffect(() => {
    setSelectedIndices(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < branches.length) next.add(i);
      });
      return next;
    });
  }, [branches.length]);

  // Extract unique level names for filter pills
  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    branches.forEach(b => set.add(b.level));
    return Array.from(set);
  }, [branches]);

  // Extract all unique node names from cables schedule (source & destination) and existing branches
  const nodeOptions = useMemo(() => {
    const set = new Set<string>();
    if (cables) {
      cables.forEach(c => {
        const s = c.source_node?.trim();
        const d = c.dest_node?.trim();
        if (s) set.add(s);
        if (d) set.add(d);
      });
    }
    branches.forEach(b => {
      const f = b.node_from?.trim();
      const t = b.node_to?.trim();
      if (f) set.add(f);
      if (t) set.add(t);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [cables, branches]);

  const nodeOptionsRef = useRef(nodeOptions);
  nodeOptionsRef.current = nodeOptions;

  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      if (levelFilter !== 'ALL' && b.level !== levelFilter) {
        return false;
      }
      if (typeFilter !== 'ALL' && b.branch_type !== typeFilter) {
        return false;
      }
      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        b.branch_id.toLowerCase().includes(q) ||
        b.node_from.toLowerCase().includes(q) ||
        b.node_to.toLowerCase().includes(q) ||
        b.level.toLowerCase().includes(q)
      );
    });
  }, [branches, levelFilter, typeFilter, globalFilter]);

  // Guard against out-of-range page index when rows are deleted
  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(filteredBranches.length / pagination.pageSize) - 1);
    if (pagination.pageIndex > maxPageIndex) {
      setPagination(prev => ({ ...prev, pageIndex: maxPageIndex }));
    }
  }, [filteredBranches.length, pagination.pageSize, pagination.pageIndex]);

  const isAllFilteredSelected =
    filteredBranches.length > 0 &&
    filteredBranches.every(b => selectedIndices.has(branches.indexOf(b)));
  const isSomeFilteredSelected =
    filteredBranches.some(b => selectedIndices.has(branches.indexOf(b))) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIndices);
    if (isAllFilteredSelected) {
      filteredBranches.forEach(b => {
        const idx = branchesRef.current.indexOf(b);
        if (idx !== -1) next.delete(idx);
      });
    } else {
      filteredBranches.forEach(b => {
        const idx = branchesRef.current.indexOf(b);
        if (idx !== -1) next.add(idx);
      });
    }
    setSelectedIndices(next);
  };

  const handleAddNew = () => {
    const branchesList = branchesRef.current;
    const lastBranch =
      levelFilter !== 'ALL' && filteredBranches.length > 0
        ? filteredBranches[filteredBranches.length - 1]
        : branchesList.length > 0
        ? branchesList[branchesList.length - 1]
        : null;

    if (lastBranch) {
      // 1. Take the last Tray Segment ID and increment its number by 1 (ensuring uniqueness)
      let nextBranchId = incrementIdentifier(lastBranch.branch_id);
      const existingBranchIds = new Set(branchesList.map(b => b.branch_id.trim().toLowerCase()));
      while (existingBranchIds.has(nextBranchId.trim().toLowerCase())) {
        nextBranchId = incrementIdentifier(nextBranchId);
      }

      // 2. Use the last ToNode as FromNode
      const nextNodeFrom = lastBranch.node_to || 'NODE_1';

      // 3. Increment ToNode to propose the next node sequence
      let nextNodeTo = incrementIdentifier(nextNodeFrom);
      if (nextNodeTo.trim().toLowerCase() === nextNodeFrom.trim().toLowerCase()) {
        nextNodeTo = `${nextNodeFrom}_NEXT`;
      }

      // 4. Use the same Elevation Level
      const nextLevel = lastBranch.level || 'Level 1';

      onAddBranch({
        branch_id: nextBranchId,
        node_from: nextNodeFrom,
        node_to: nextNodeTo,
        level: nextLevel,
        branch_type: 'horizontal',
        length_m: 6.0,
        tray_height_mm: lastBranch.tray_height_mm ?? defaultTrayHeightRef.current,
        mounting_type: lastBranch.mounting_type || defaultMountingTypeRef.current || 'ceiling_trapeze',
      });
    } else {
      const newIdx = 1;
      onAddBranch({
        branch_id: `BR_L1_${newIdx.toString().padStart(2, '0')}`,
        node_from: `NODE_${newIdx}`,
        node_to: `NODE_${newIdx + 1}`,
        level: 'Level 1',
        branch_type: 'horizontal',
        length_m: 6.0,
        tray_height_mm: defaultTrayHeightRef.current,
        mounting_type: defaultMountingTypeRef.current || 'ceiling_trapeze',
      });
    }

    // Keep user on the same page, or advance to the new page if on the last page and it was full
    const currentTotal = filteredBranches.length;
    const isAtLastPage = pagination.pageIndex === Math.max(0, Math.ceil(currentTotal / pagination.pageSize) - 1);
    if (isAtLastPage && currentTotal % pagination.pageSize === 0 && currentTotal > 0) {
      setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
    }
  };

  const columns = useMemo<ColumnDef<Branch>[]>(
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
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              title="Select all filtered branches"
            />
          </div>
        ),
        cell: ({ row }) => {
          const originalIdx = branchesRef.current.indexOf(row.original);
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
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          );
        },
      },
      {
        accessorKey: 'branch_id',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 hover:bg-transparent font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Tray Segment ID
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          return (
            <EditableCellInput
              value={row.original.branch_id}
              onSave={newId => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, { ...row.original, branch_id: newId });
                }
              }}
              className="font-mono text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none w-32"
            />
          );
        },
      },
      {
        accessorKey: 'node_from',
        header: 'From Node',
        cell: ({ row }) => {
          return (
            <NodeComboboxCell
              value={row.original.node_from}
              options={nodeOptionsRef.current}
              onSave={newFrom => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, { ...row.original, node_from: newFrom });
                }
              }}
              placeholder="From Node..."
              widthClass="w-32"
            />
          );
        },
      },
      {
        accessorKey: 'node_to',
        header: 'To Node',
        cell: ({ row }) => {
          return (
            <NodeComboboxCell
              value={row.original.node_to}
              options={nodeOptionsRef.current}
              onSave={newTo => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, { ...row.original, node_to: newTo });
                }
              }}
              placeholder="To Node..."
              widthClass="w-32"
            />
          );
        },
      },
      {
        accessorKey: 'level',
        header: 'Elevation Level',
        cell: ({ row }) => {
          return (
            <EditableCellInput
              value={row.original.level}
              onSave={newLevel => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, { ...row.original, level: newLevel });
                }
              }}
              className="text-xs px-1.5 py-0.5 rounded font-medium border border-transparent hover:border-slate-300 focus:border-blue-500 bg-slate-50 text-slate-700 outline-none w-28"
            />
          );
        },
      },
      {
        accessorKey: 'branch_type',
        header: 'Orientation',
        cell: ({ row }) => {
          const isVertical = row.original.branch_type === 'vertical';
          return (
            <button
              onClick={() => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, {
                    ...row.original,
                    branch_type: isVertical ? 'horizontal' : 'vertical',
                  });
                }
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer border transition ${
                isVertical
                  ? 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
                  : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
              }`}
              title="Click to toggle Horizontal / Vertical Riser"
            >
              {isVertical ? (
                <>
                  <MoveVertical className="h-3 w-3" /> Vertical Riser
                </>
              ) : (
                <>
                  <MoveHorizontal className="h-3 w-3" /> Horizontal
                </>
              )}
            </button>
          );
        },
      },
      {
        accessorKey: 'length_m',
        header: 'Length (m)',
        cell: ({ row }) => {
          return (
            <EditableCellInput
              type="number"
              step="0.5"
              min="0.5"
              value={row.original.length_m}
              onSave={newLen => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, {
                    ...row.original,
                    length_m: parseFloat(String(newLen)) || 1,
                  });
                }
              }}
              className="font-mono text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1 py-0.5 rounded w-16 outline-none"
            />
          );
        },
      },
      {
        accessorKey: 'tray_height_mm',
        header: 'Height (mm)',
        cell: ({ row }) => {
          const val = row.original.tray_height_mm ?? defaultTrayHeightRef.current;
          return (
            <EditableCellInput
              type="number"
              step="5"
              min="30"
              value={val}
              onSave={newH => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, {
                    ...row.original,
                    tray_height_mm: parseFloat(String(newH)) || defaultTrayHeightRef.current,
                  });
                }
              }}
              className="font-mono text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-1 py-0.5 rounded w-16 outline-none"
            />
          );
        },
      },
      {
        accessorKey: 'mounting_type',
        header: 'Support Style',
        cell: ({ row }) => {
          const effectiveMounting = row.original.mounting_type || defaultMountingTypeRef.current || 'ceiling_trapeze';
          const isWall = effectiveMounting === 'wall_cantilever';
          return (
            <button
              onClick={() => {
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) {
                  onUpdateBranchRef.current(idx, {
                    ...row.original,
                    mounting_type: isWall ? 'ceiling_trapeze' : 'wall_cantilever',
                  });
                }
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer border transition ${
                isWall
                  ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
              }`}
              title="Click to toggle Ceiling Trapeze / Wall Cantilever support"
            >
              {isWall ? 'Wall Cantilever' : 'Ceiling Trapeze'}
            </button>
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
                const idx = branchesRef.current.indexOf(row.original);
                if (idx !== -1) onDeleteBranchRef.current(idx);
              }}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
              title="Delete Branch"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    // Only recompute columns when selection changes or default mounting changes
    [selectedIndices, isAllFilteredSelected, isSomeFilteredSelected, defaultMountingType]
  );

  const table = useReactTable({
    data: filteredBranches,
    columns,
    getRowId: (row, index) => `${row.branch_id || 'branch'}_${index}`,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
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
              placeholder="Search segment ID, node, level..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setLevelFilter('ALL')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                levelFilter === 'ALL'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Levels
            </button>
            {availableLevels.map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                  levelFilter === lvl
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Orientation Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {['ALL', 'horizontal', 'vertical'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium capitalize transition ${
                  typeFilter === type
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'ALL' ? 'All Types' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {selectedIndices.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${selectedIndices.size} selected branch(es)?`)) {
                  if (onDeleteMultipleBranches) {
                    onDeleteMultipleBranches(Array.from(selectedIndices));
                  } else {
                    const sorted = Array.from(selectedIndices).sort((a, b) => b - a);
                    sorted.forEach(idx => onDeleteBranch(idx));
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

          {branches.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete all ${branches.length} branches and risers from this project?`)) {
                  if (onDeleteAllBranches) {
                    onDeleteAllBranches();
                  } else if (onDeleteMultipleBranches) {
                    onDeleteMultipleBranches(branches.map((_, i) => i));
                  }
                  setSelectedIndices(new Set());
                }
              }}
              className="text-xs h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold gap-1.5"
              title="Delete all branches and risers in this project"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete All
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleAddNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 shadow-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Branch / Riser
          </Button>
        </div>
      </div>

      {/* TanStack Branches Table */}
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
              const originalIdx = branchesRef.current.indexOf(row.original);
              const isSelected = selectedIndices.has(originalIdx);
              return (
                <TableRow
                  key={row.id}
                  className={isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50/90' : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="text-xs py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                No branch or riser segments match the filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 bg-slate-50 text-xs rounded-b-xl">
        <div className="flex flex-wrap items-center gap-3 text-slate-500">
          <span>Showing {table.getRowModel().rows.length} of {filteredBranches.length} segments</span>
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span>Lines per page:</span>
            <select
              value={pagination.pageSize}
              onChange={e => {
                const newSize = Number(e.target.value);
                setStoredPageSize(newSize, 'branches');
                setPagination({ pageIndex: 0, pageSize: newSize });
              }}
              className="h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
  );
}
