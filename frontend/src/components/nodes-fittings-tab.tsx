'use client';

import React, { useState, useMemo } from 'react';
import {
  CalculatedNodeFitting,
  NodeFittingConfig,
  FittingType,
  ReducerType,
  NodePortReducer,
} from '@/lib/types';
import { FITTING_TYPE_NAMES, REDUCER_TYPE_NAMES } from '@/lib/fittings-engine';
import {
  FittingIllustration,
  ReducerIllustration,
  FittingDetailModal,
  FittingGuideModal,
  FITTING_CATALOG_REGISTRY,
} from '@/components/fitting-illustrations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  RotateCcw,
  GitBranch,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Sliders,
  Filter,
  Info,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  BookOpen,
  Eye,
  ShieldCheck,
} from 'lucide-react';

interface NodesFittingsTabProps {
  nodes: CalculatedNodeFitting[];
  nodeConfigs: Record<string, NodeFittingConfig>;
  onChangeNodeConfig: (nodeId: string, updated: NodeFittingConfig) => void;
  onResetNode: (nodeId: string) => void;
  onResetAllNodes: () => void;
  onToggleAllReducers: (enabled: boolean) => void;
}

export function NodesFittingsTab({
  nodes,
  nodeConfigs,
  onChangeNodeConfig,
  onResetNode,
  onResetAllNodes,
  onToggleAllReducers,
}: NodesFittingsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [reducerFilter, setReducerFilter] = useState<'all' | 'has_reducers' | 'equal'>('all');
  const [inspectNode, setInspectNode] = useState<CalculatedNodeFitting | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Summary KPIs
  const totalNodesCount = nodes.length;
  const fittingsCount = useMemo(() => {
    return nodes.filter(n => n.selected_fitting_type !== 'none' && n.selected_fitting_type !== 'end_cap' && n.selected_fitting_type !== 'closed_bend').length;
  }, [nodes]);

  const reducersCount = useMemo(() => {
    return nodes.reduce((sum, n) => {
      const active = Object.values(n.reducers).filter(r => r.enabled).length;
      return sum + active;
    }, 0);
  }, [nodes]);

  const endCapsCount = useMemo(() => {
    return nodes.filter(n => n.selected_fitting_type === 'end_cap' || n.selected_fitting_type === 'closed_bend').length;
  }, [nodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      // Search filter
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        n.node_id.toLowerCase().includes(term) ||
        n.level.toLowerCase().includes(term) ||
        n.connected_branches.some(b => b.branch_id.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // Type filter
      if (selectedTypeFilter !== 'all') {
        if (n.selected_fitting_type !== selectedTypeFilter) return false;
      }

      // Reducer filter
      const hasActiveReducers = Object.values(n.reducers).some(r => r.enabled);
      if (reducerFilter === 'has_reducers' && !hasActiveReducers) return false;
      if (reducerFilter === 'equal' && Object.keys(n.reducers).length > 0) return false;

      return true;
    });
  }, [nodes, searchTerm, selectedTypeFilter, reducerFilter]);

  const handleFittingTypeChange = (node: CalculatedNodeFitting, newType: FittingType) => {
    const existing = nodeConfigs[node.node_id] || { node_id: node.node_id };
    onChangeNodeConfig(node.node_id, {
      ...existing,
      fitting_type: newType,
      user_override: newType !== node.detected_fitting_type,
    });
  };

  const handleCoverToggle = (node: CalculatedNodeFitting, includeCover: boolean) => {
    const existing = nodeConfigs[node.node_id] || { node_id: node.node_id };
    onChangeNodeConfig(node.node_id, {
      ...existing,
      include_cover: includeCover,
      user_override: true,
    });
  };

  const handleReducerToggle = (node: CalculatedNodeFitting, branchId: string, enabled: boolean) => {
    const existing = nodeConfigs[node.node_id] || { node_id: node.node_id };
    const currentReducers = existing.reducers ? { ...existing.reducers } : { ...node.reducers };
    const current = currentReducers[branchId] || node.reducers[branchId];

    if (current) {
      currentReducers[branchId] = {
        ...current,
        enabled,
      };
      onChangeNodeConfig(node.node_id, {
        ...existing,
        reducers: currentReducers,
        user_override: true,
      });
    }
  };

  const handleReducerGeometryChange = (node: CalculatedNodeFitting, branchId: string, geometry: ReducerType) => {
    const existing = nodeConfigs[node.node_id] || { node_id: node.node_id };
    const currentReducers = existing.reducers ? { ...existing.reducers } : { ...node.reducers };
    const current = currentReducers[branchId] || node.reducers[branchId];

    if (current) {
      currentReducers[branchId] = {
        ...current,
        reducer_type: geometry,
      };
      onChangeNodeConfig(node.node_id, {
        ...existing,
        reducers: currentReducers,
        user_override: true,
      });
    }
  };

  if (totalNodesCount === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <GitBranch className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">No Network Nodes Discovered</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Add cable tray branches and run calculation. All intersection and junction nodes will be automatically extracted, sized, and fitted with standard tees, elbows, and reducers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold">Network Nodes, Fittings &amp; In-Line Reducers</h2>
            <Badge variant="outline" className="bg-indigo-950/80 text-indigo-300 border-indigo-800 text-[10px]">
              APV Industrial Catalog
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Fittings automatically adapt nominal dimensions to the widest branch connected to each node. Any narrower branch receives an in-line reducer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGuideOpen(true)}
            className="bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 text-xs gap-1.5 h-8 font-semibold shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            APV Fittings Guide
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetAllNodes}
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1.5 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleAllReducers(true)}
            className="bg-indigo-900/60 border-indigo-700 text-indigo-200 hover:bg-indigo-800 hover:text-white text-xs gap-1.5 h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Enable All Reducers
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Nodes</p>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalNodesCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tray Fittings</p>
              <div className="text-2xl font-black text-indigo-600 mt-1">{fittingsCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Reducers</p>
              <div className="text-2xl font-black text-amber-600 mt-1">{reducersCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Terminal End Caps</p>
              <div className="text-2xl font-black text-slate-700 mt-1">{endCapsCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search node ID, level, or branch..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-8 border-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Fitting Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">Type:</span>
            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              className="h-8 text-xs px-2 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Fitting Types</option>
              <option value="horizontal_tee">Equal Tee</option>
              <option value="horizontal_half_tee">Half Equal Tee</option>
              <option value="horizontal_cross">Crosspiece (4-Way)</option>
              <option value="horizontal_elbow_90">90° Flat Bend</option>
              <option value="horizontal_elbow_45">45° Flat Bend</option>
              <option value="vertical_inside_riser">90° Inside Riser</option>
              <option value="vertical_outside_riser">90° Outside Riser</option>
              <option value="vertical_inside_riser_45">45° Inside Riser</option>
              <option value="vertical_outside_riser_45">45° Outside Riser</option>
              <option value="vertical_downward_tee">Vertical Downward Tee</option>
              <option value="skewed_downward_bend">Right Skewed Bend</option>
              <option value="electrical_board_outlet">Electrical Board Outlet</option>
              <option value="straight_coupler">Straight Coupler</option>
              <option value="closed_bend">Closed Bend</option>
              <option value="end_cap">End Cap</option>
              <option value="none">Pass-Through</option>
            </select>
          </div>

          {/* Reducer Status Filter */}
          <select
            value={reducerFilter}
            onChange={e => setReducerFilter(e.target.value as any)}
            className="h-8 text-xs px-2 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Reducer States</option>
            <option value="has_reducers">Has Active Reducers</option>
            <option value="equal">Equal Widths (No Reducers)</option>
          </select>

          <span className="text-xs text-slate-500 ml-2">
            Showing <strong className="text-slate-900">{filteredNodes.length}</strong> of {totalNodesCount} nodes
          </span>
        </div>
      </div>

      {/* Nodes & Fittings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-40">Node ID &amp; Level</th>
                <th className="py-3 px-4 w-64">Connected Branches &amp; Sized Widths</th>
                <th className="py-3 px-4 w-80">Fitting Type (APV Catalog)</th>
                <th className="py-3 px-4 w-32">Nominal Size</th>
                <th className="py-3 px-4">Port Reducers (In-Line Reductions)</th>
                <th className="py-3 px-3 text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredNodes.map(node => {
                const isOverridden = node.user_override;
                const nodeConfig = nodeConfigs[node.node_id];
                const reducerList = Object.values(node.reducers);
                const hasReducers = reducerList.length > 0;
                const catalogMeta = FITTING_CATALOG_REGISTRY[node.selected_fitting_type];
                const hasCoverInCatalog = catalogMeta?.hasCover;

                return (
                  <tr key={node.node_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Node ID & Level */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {node.node_id}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Level: <span className="font-semibold text-slate-700">{node.level}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {node.connected_branches.length} branch{node.connected_branches.length === 1 ? '' : 'es'} connected
                      </div>
                    </td>

                    {/* Connected Branches with Sized Widths */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {node.connected_branches.map(b => {
                          const isMax = b.width_mm === node.width_mm;
                          return (
                            <div
                              key={b.branch_id}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] ${
                                isMax
                                  ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-medium'
                                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
                              }`}
                            >
                              <span className="font-mono text-[10px]">{b.branch_id}</span>
                              <span
                                className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                                  isMax ? 'bg-blue-200/70 text-blue-800' : 'bg-amber-200/70 text-amber-800'
                                }`}
                              >
                                {b.width_mm} mm
                              </span>
                              <span className="text-[9px] text-slate-400 capitalize">
                                {b.branch_type === 'vertical' ? 'vert' : 'horiz'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Fitting Type with Visual Picture Thumbnail */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-start gap-2.5">
                        {/* Picture Thumbnail Card */}
                        <div
                          onClick={() => setInspectNode(node)}
                          className="w-11 h-11 flex-shrink-0 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-center p-1 group relative shadow-2xs"
                          title="Click to inspect 3D engineering diagram"
                        >
                          <FittingIllustration type={node.selected_fitting_type} size={36} />
                          <div className="absolute inset-0 bg-indigo-600/10 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-indigo-700" />
                          </div>
                        </div>

                        {/* Dropdown & Metadata */}
                        <div className="space-y-1.5 flex-1 min-w-[190px]">
                          <select
                            value={node.selected_fitting_type}
                            onChange={e => handleFittingTypeChange(node, e.target.value as FittingType)}
                            className="w-full h-8 text-xs font-semibold px-2 border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <optgroup label="Horizontal Junctions">
                              <option value="horizontal_tee">Equal Tee (Horizontal Tee)</option>
                              <option value="horizontal_half_tee">Half Equal Tee (Offset Branch)</option>
                              <option value="horizontal_cross">Crosspiece (4-Way Cross)</option>
                              <option value="vertical_downward_tee">Vertical Downward Skewed Tee</option>
                            </optgroup>
                            <optgroup label="Flat Bends (Horizontal Elbows)">
                              <option value="horizontal_elbow_90">90° Flat Bend</option>
                              <option value="horizontal_elbow_45">45° Flat Bend</option>
                            </optgroup>
                            <optgroup label="Vertical Risers &amp; Offsets">
                              <option value="vertical_inside_riser">90° Inside Riser (Upward)</option>
                              <option value="vertical_outside_riser">90° Outside Riser (Downward)</option>
                              <option value="vertical_inside_riser_45">45° Inside Riser (Upward)</option>
                              <option value="vertical_outside_riser_45">45° Outside Riser (Downward)</option>
                              <option value="skewed_downward_bend">Right Downward Skewed Bend</option>
                            </optgroup>
                            <optgroup label="Terminations &amp; Outlets">
                              <option value="electrical_board_outlet">Electrical Board Outlet / Drop Flange</option>
                              <option value="straight_coupler">Straight Splice Coupler</option>
                              <option value="closed_bend">Closed Bend / Terminal End</option>
                              <option value="end_cap">End Cap / Terminal Drop</option>
                              <option value="none">None / Pass-Through</option>
                            </optgroup>
                          </select>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {isOverridden ? (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-300">
                                Manual Override
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 border-slate-200">
                                Auto-Detected
                              </Badge>
                            )}

                            {/* Cover Checkbox if fitting has cover in catalog */}
                            {hasCoverInCatalog && (
                              <label className="inline-flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer select-none bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100">
                                <input
                                  type="checkbox"
                                  checked={nodeConfig?.include_cover || false}
                                  onChange={e => handleCoverToggle(node, e.target.checked)}
                                  className="w-3 h-3 text-indigo-600 rounded border-slate-300 cursor-pointer"
                                />
                                <span>Cover</span>
                              </label>
                            )}

                            <button
                              onClick={() => setInspectNode(node)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 ml-auto"
                              title="Inspect fitting illustration & specification"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Nominal Fitting Size */}
                    <td className="py-3 px-4 align-top">
                      {node.selected_fitting_type !== 'none' ? (
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {node.width_mm} &times; {node.height_mm} mm
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Max Branch: <strong>{node.width_mm} mm</strong>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">&mdash;</span>
                      )}
                    </td>

                    {/* Port Reducers with Visual Thumbnail */}
                    <td className="py-3 px-4 align-top">
                      {node.selected_fitting_type === 'none' ? (
                        <span className="text-slate-400 italic text-[11px]">No fitting installed</span>
                      ) : !hasReducers ? (
                        <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Equal Width Ports (No Reducers)
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {reducerList.map(reducer => {
                            return (
                              <div
                                key={reducer.branch_id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded border text-[11px] ${
                                  reducer.enabled
                                    ? 'bg-amber-50/60 border-amber-200/80 text-amber-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={reducer.enabled}
                                      onChange={e => handleReducerToggle(node, reducer.branch_id, e.target.checked)}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span className="font-mono font-semibold text-[10px]">{reducer.branch_id}:</span>
                                  </label>

                                  {/* Reducer Visual Thumbnail Picture */}
                                  <div
                                    className="w-7 h-7 flex-shrink-0 bg-white rounded border border-amber-200 flex items-center justify-center p-0.5 shadow-2xs"
                                    title={`${reducer.reducer_type} diagram`}
                                  >
                                    <ReducerIllustration type={reducer.reducer_type} size={24} />
                                  </div>

                                  <span className="font-bold text-[11px]">
                                    {reducer.from_width_mm} &rarr; {reducer.to_width_mm} mm
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <select
                                    disabled={!reducer.enabled}
                                    value={reducer.reducer_type}
                                    onChange={e =>
                                      handleReducerGeometryChange(node, reducer.branch_id, e.target.value as ReducerType)
                                    }
                                    className="h-6 px-1.5 text-[10px] font-medium border border-slate-200 rounded bg-white text-slate-700 disabled:opacity-50"
                                  >
                                    <option value="concentric">Concentric (Symmetric)</option>
                                    <option value="eccentric_left">Left Reducer (Flat Left)</option>
                                    <option value="eccentric_right">Right Reducer (Flat Right)</option>
                                    <option value="height_reducer">Height Reducer (Flange Step)</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 align-top text-right">
                      {isOverridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onResetNode(node.node_id)}
                          className="h-7 px-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-[10px] gap-1"
                          title="Reset to auto-detected default"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fitting Detail Inspection Modal */}
      {inspectNode && (
        <FittingDetailModal
          type={inspectNode.selected_fitting_type}
          nodeId={inspectNode.node_id}
          nominalSize={`${inspectNode.width_mm} × ${inspectNode.height_mm} mm`}
          open={Boolean(inspectNode)}
          onOpenChange={open => !open && setInspectNode(null)}
          includeCover={nodeConfigs[inspectNode.node_id]?.include_cover || false}
          onToggleCover={include => handleCoverToggle(inspectNode, include)}
        />
      )}

      {/* APV Fitting Guide Reference Modal */}
      <FittingGuideModal
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />
    </div>
  );
}
