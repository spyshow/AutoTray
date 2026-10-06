'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ExpandedState,
} from '@tanstack/react-table';
import { BranchSizingResult } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronRight,
  ChevronDown,
  Search,
  ArrowUpDown,
  Download,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ResultsTableProps {
  data: BranchSizingResult[];
  onExportExcel: () => void;
  isExporting?: boolean;
}

export function ResultsTable({ data, onExportExcel, isExporting }: ResultsTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const levels = useMemo(() => {
    const set = new Set(data.map(d => d.level));
    return ['ALL', ...Array.from(set)];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        item.branch_id.toLowerCase().includes(q) ||
        item.node_from.toLowerCase().includes(q) ||
        item.node_to.toLowerCase().includes(q) ||
        item.level.toLowerCase().includes(q) ||
        item.cables_routed.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [data, levelFilter, statusFilter, globalFilter]);

  const columns = useMemo<ColumnDef<BranchSizingResult>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              onClick={row.getToggleExpandedHandler()}
              className="p-1 hover:bg-slate-200 rounded transition text-slate-600"
              title="View Routed Cables"
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : null;
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
            Tray Segment
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-mono font-semibold text-slate-900 flex items-center gap-1.5">
            {row.original.branch_id}
          </div>
        ),
      },
      {
        id: 'route_span',
        header: 'Nodes (From ➔ To)',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs">
            <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              {row.original.node_from}
            </span>
            <span className="text-slate-400">➔</span>
            <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              {row.original.node_to}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => {
          const lvl = row.original.level;
          const isRiser = row.original.branch_type === 'vertical' || lvl.toLowerCase().includes('transition');
          if (isRiser) {
            return (
              <Badge variant="riser" className="text-[11px] font-normal">
                Vertical Riser
              </Badge>
            );
          }
          return (
            <Badge variant="secondary" className="text-[11px] font-normal">
              {lvl}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'cable_count',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 hover:bg-transparent font-bold text-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Cables
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-center font-medium">
            <span className="font-bold text-slate-900">{row.original.cable_count}</span>
            <div className="text-[10px] text-slate-500">
              P:{row.original.power_cables_count} | C:{row.original.control_cables_count} | D:{row.original.data_cables_count}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'calculated_width_mm',
        header: 'Req. Width',
        cell: ({ row }) => (
          <div className="text-right font-mono text-slate-700">
            {row.original.calculated_width_mm} mm
          </div>
        ),
      },
      {
        accessorKey: 'recommended_commercial_width_mm',
        header: 'Standard Size',
        cell: ({ row }) => (
          <div className="text-center">
            <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-2 py-0.5 rounded">
              W: {row.original.recommended_commercial_width_mm} mm
            </span>
            <span className="block text-[10px] text-slate-500">
              H: {row.original.tray_height_mm} mm
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'fill_ratio_pct',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 hover:bg-transparent font-bold text-right"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Fill Ratio (%)
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const fill = row.original.fill_ratio_pct;
          const barColor = fill > 90 ? 'bg-red-500' : fill > 70 ? 'bg-amber-500' : 'bg-emerald-500';
          return (
            <div className="w-28 space-y-1 ml-auto">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span>{fill}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor}`}
                  style={{ width: `${Math.min(fill, 100)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'total_load_kg_m',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 hover:bg-transparent font-bold text-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Load &amp; Span
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const load = row.original.total_load_kg_m ?? 0;
          const span = row.original.recommended_support_span_m ?? 2.0;
          const count = row.original.supports_count ?? 1;
          const mType = row.original.support_mounting_type === 'wall_cantilever' ? 'Wall' : 'Ceiling';
          return (
            <div className="text-center">
              <span className="font-mono font-bold text-xs text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                {load} kg/m
              </span>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Span: <strong>{span}m</strong> &bull; {count} supp. ({mType})
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status;
          const warnings = row.original.warnings || [];
          return (
            <div className="flex flex-col gap-1 items-start">
              {s === 'OK' && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> OK
                </Badge>
              )}
              {s === 'OVERFILL_SPLIT_TIER' && (
                <Badge variant="destructive" className="gap-1 animate-pulse">
                  <AlertOctagon className="h-3 w-3" /> Overfill Split
                </Badge>
              )}
              {s !== 'OK' && s !== 'OVERFILL_SPLIT_TIER' && (
                <Badge variant="secondary">EMPTY</Badge>
              )}
              {warnings.map((w, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-normal flex items-center gap-1 max-w-[220px] truncate"
                  title={w}
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                  <span className="truncate">{w}</span>
                </Badge>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      expanded,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getRowCanExpand: row => (row.original.cables_detail?.length || 0) > 0 || (row.original.cables_routed?.length || 0) > 0,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search branch, nodes, cables..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-8 text-xs h-9 bg-slate-50"
            />
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="text-xs h-9 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-slate-700"
          >
            {levels.map(l => (
              <option key={l} value={l}>
                {l === 'ALL' ? 'All Elevations' : l}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs h-9 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="OK">OK Only</option>
            <option value="OVERFILL_SPLIT_TIER">Overfilled Only</option>
            <option value="EMPTY">Empty Trays</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={onExportExcel}
            disabled={isExporting}
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Download className="h-4 w-4 mr-1.5" />
            {isExporting ? 'Generating...' : 'Export Excel Report'}
          </Button>
        </div>
      </div>

      {/* Sizing Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="bg-slate-100 hover:bg-slate-100">
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="text-xs font-bold text-slate-700 py-3">
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
              table.getRowModel().rows.map(row => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className={row.getIsExpanded() ? 'bg-blue-50/40' : undefined}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="text-xs py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Expandable Sub-Row (Routed Cables List & Structural Breakdown) */}
                  {row.getIsExpanded() && (
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b-2 border-slate-200">
                      <TableCell colSpan={columns.length} className="p-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-inner space-y-3">
                          {/* Structural Loading & Support Analysis Card */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase font-medium">Cables Weight</span>
                              <strong className="text-slate-800 font-mono">{row.original.cable_load_kg_m ?? 0} kg/m</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase font-medium">Tray Steel Weight</span>
                              <strong className="text-slate-800 font-mono">{row.original.tray_dead_load_kg_m ?? 0} kg/m</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase font-medium">Design Load (+15%)</span>
                              <strong className="text-indigo-700 font-mono">{row.original.total_load_kg_m ?? 0} kg/m</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase font-medium">Safe Span (IEC 61537)</span>
                              <strong className="text-emerald-700 font-mono">{row.original.recommended_support_span_m ?? 2.0} m</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase font-medium">Supports ({row.original.support_mounting_type === 'wall_cantilever' ? 'Wall' : 'Ceiling'})</span>
                              <strong className="text-amber-700 font-mono">{row.original.supports_count ?? 1} pcs</strong>
                              <span className="text-[10px] text-slate-400 ml-1">({row.original.load_utilization_pct ?? 0}% util)</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-blue-600" />
                              Cables Routed on Tray [{row.original.branch_id}] ({row.original.cable_count} items)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Tray Side Height: {row.original.tray_height_mm} mm
                            </span>
                          </div>

                          <div className="overflow-x-auto max-h-56 text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                                  <th className="p-1.5">Cable Tag</th>
                                  <th className="p-1.5">Source ➔ Dest</th>
                                  <th className="p-1.5">Category</th>
                                  <th className="p-1.5">Formation</th>
                                  <th className="p-1.5 text-right">OD (mm)</th>
                                  <th className="p-1.5 text-right">Qty</th>
                                  <th className="p-1.5 text-right">Width (mm)</th>
                                  <th className="p-1.5 text-right">Weight (kg/m)</th>
                                  <th className="p-1.5 text-right">Total Wt (kg)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {row.original.cables_detail && row.original.cables_detail.length > 0 ? (
                                  row.original.cables_detail.map((cd, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="p-1.5 font-mono font-medium text-slate-900">{cd.cable_tag}</td>
                                      <td className="p-1.5 text-slate-600">{cd.source_node} ➔ {cd.dest_node}</td>
                                      <td className="p-1.5">
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] uppercase ${
                                            cd.cable_type === 'power'
                                              ? 'border-amber-300 text-amber-800 bg-amber-50'
                                              : 'border-blue-300 text-blue-800 bg-blue-50'
                                          }`}
                                        >
                                          {cd.cable_type}
                                        </Badge>
                                      </td>
                                      <td className="p-1.5">
                                        {cd.formation ? (
                                          <Badge variant="secondary" className="text-[10px] font-normal">
                                            {cd.formation === 'trefoil' ? 'Trefoil (Δ)' : cd.formation === 'flat_touching' ? 'Flat Touching' : 'Flat Spaced'}
                                          </Badge>
                                        ) : (
                                          <span className="text-slate-400 text-[11px]">-</span>
                                        )}
                                      </td>
                                      <td className="p-1.5 text-right font-mono">{cd.od_mm}</td>
                                      <td className="p-1.5 text-right font-mono">{cd.count}</td>
                                      <td className="p-1.5 text-right font-mono font-semibold text-slate-800">
                                        {cd.width_contribution_mm} mm
                                      </td>
                                      <td className="p-1.5 text-right font-mono text-slate-700">
                                        {cd.weight_kg_m ?? '-'}
                                      </td>
                                      <td className="p-1.5 text-right font-mono font-semibold text-slate-800">
                                        {cd.total_weight_kg ? `${cd.total_weight_kg} kg` : '-'}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  row.original.cables_routed.map((tag, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="p-1.5 font-mono font-medium text-slate-900">{tag}</td>
                                      <td colSpan={8} className="p-1.5 text-slate-500 italic">Routed via shortest path</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No branch sizing records found matching query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50 text-xs">
          <div className="text-slate-500">
            Showing {table.getRowModel().rows.length} of {filteredData.length} branches
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
            <span className="font-semibold text-slate-700">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
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
