'use client';

import React, { useState, useMemo } from 'react';
import { Branch, BranchSizingResult, Cable, CableRoutedDetail } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Layers,
  Activity,
  MoveVertical,
  ShieldAlert,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  FolderOpen,
  FolderClosed,
  Cable as CableIcon,
  Search,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

interface NetworkGraphViewProps {
  branches: Branch[];
  results: BranchSizingResult[];
  cables: Cable[];
}

interface NodeCoord {
  id: string;
  level: string;
  x: number;
  y: number;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  isCollapsed: boolean;
}

function sortLevelsNaturally(levels: string[]): string[] {
  const getLevelNum = (str: string): number | null => {
    const match = str.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  return [...levels].sort((a, b) => {
    const numA = getLevelNum(a);
    const numB = getLevelNum(b);
    if (numA !== null && numB !== null) {
      return numB - numA; // Higher elevation levels at top
    }
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return a.localeCompare(b);
  });
}

export function NetworkGraphView({ branches, results, cables }: NetworkGraphViewProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [activeLevelFilter, setActiveLevelFilter] = useState<string>('all');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<number>(1.0);
  const [cableSearchQuery, setCableSearchQuery] = useState<string>('');
  const [isCablesExpanded, setIsCablesExpanded] = useState<boolean>(true);

  // Toggle collapse/expand of a node
  const toggleNodeCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setCollapsedNodes(new Set());
  };

  const handleCollapseAll = () => {
    // Collapse every parent node that has children
    const allParents = new Set<string>();
    branches.forEach(b => {
      allParents.add(b.node_from);
    });
    setCollapsedNodes(allParents);
  };

  // Group nodes by actual added levels and compute Mind Map tree coordinates
  const { actualLevels, levelBands, nodeCoords, svgWidth, svgHeight } = useMemo(() => {
    if (!branches || branches.length === 0) {
      return { actualLevels: [], levelBands: [], nodeCoords: {}, svgWidth: 900, svgHeight: 400 };
    }

    // 1. Extract only the actual non-empty levels present in the project's branches
    const detectedLevelsSet = new Set<string>();
    branches.forEach(b => {
      const lvl = (b.level || '').trim();
      if (lvl && b.branch_type !== 'vertical' && !lvl.toLowerCase().includes('transition')) {
        detectedLevelsSet.add(lvl);
      }
    });

    if (detectedLevelsSet.size === 0) {
      branches.forEach(b => {
        const lvl = (b.level || '').trim();
        if (lvl) detectedLevelsSet.add(lvl);
      });
    }

    const allActualLevels = sortLevelsNaturally(
      Array.from(detectedLevelsSet.size > 0 ? detectedLevelsSet : ['Level 0'])
    );

    const displayedLevels = activeLevelFilter === 'all'
      ? allActualLevels
      : allActualLevels.filter(lvl => lvl === activeLevelFilter);

    // 2. Map nodes to their level
    const nodeLevelMap: Record<string, string> = {};
    branches.filter(b => b.branch_type !== 'vertical').forEach(b => {
      const lvl = (b.level || '').trim() || allActualLevels[0];
      nodeLevelMap[b.node_from] = lvl;
      nodeLevelMap[b.node_to] = lvl;
    });

    branches.filter(b => b.branch_type === 'vertical').forEach(b => {
      const lvl = (b.level || '').trim() || allActualLevels[0];
      if (!nodeLevelMap[b.node_from]) nodeLevelMap[b.node_from] = lvl;
      if (!nodeLevelMap[b.node_to]) nodeLevelMap[b.node_to] = lvl;
    });

    const nodesByLevel: Record<string, Set<string>> = {};
    allActualLevels.forEach(lvl => { nodesByLevel[lvl] = new Set(); });
    Object.entries(nodeLevelMap).forEach(([nId, lvl]) => {
      if (nodesByLevel[lvl]) {
        nodesByLevel[lvl].add(nId);
      } else if (allActualLevels[0]) {
        nodesByLevel[allActualLevels[0]].add(nId);
      }
    });

    // 3. For each displayed level, build a hierarchical Mind Map tree
    const leafHeight = 58;
    const colWidth = 220;
    const leftMargin = 140;
    const rightMargin = 180;
    let globalMaxDepth = 0;
    let currentY = 30;

    const computedBands: {
      name: string;
      branchCount: number;
      nodeCount: number;
      yStart: number;
      yEnd: number;
      height: number;
      color: string;
      borderColor: string;
    }[] = [];

    const computedCoords: Record<string, NodeCoord> = {};

    const bandPalettes = [
      { bg: 'rgba(248, 250, 252, 0.75)', border: '#CBD5E1' },
      { bg: 'rgba(238, 242, 255, 0.65)', border: '#C7D2FE' },
      { bg: 'rgba(240, 253, 250, 0.65)', border: '#99F6E4' },
      { bg: 'rgba(254, 243, 199, 0.60)', border: '#FDE68A' },
    ];

    displayedLevels.forEach((lvl, lvlIdx) => {
      const levelNodes = Array.from(nodesByLevel[lvl] || []);
      const levelBranches = branches.filter(b =>
        nodeLevelMap[b.node_from] === lvl && nodeLevelMap[b.node_to] === lvl
      );

      // Build adjacency & inDegree for this level
      const childrenMap: Record<string, string[]> = {};
      const inDegree: Record<string, number> = {};
      levelNodes.forEach(n => {
        childrenMap[n] = [];
        inDegree[n] = 0;
      });

      levelBranches.forEach(b => {
        if (childrenMap[b.node_from] && inDegree[b.node_to] !== undefined) {
          childrenMap[b.node_from].push(b.node_to);
          inDegree[b.node_to] = (inDegree[b.node_to] || 0) + 1;
        }
      });

      // Find root nodes (inDegree === 0)
      const roots = levelNodes.filter(n => (inDegree[n] || 0) === 0);
      roots.sort();
      if (roots.length === 0 && levelNodes.length > 0) {
        roots.push(levelNodes[0]);
      }

      // Decompose into tree structure (handling any potential loops gracefully)
      const treeChildren: Record<string, string[]> = {};
      const visited = new Set<string>();
      const queue = [...roots];
      roots.forEach(r => {
        visited.add(r);
        treeChildren[r] = [];
      });

      while (queue.length > 0) {
        const u = queue.shift();
        if (!u) break;
        if (!treeChildren[u]) treeChildren[u] = [];
        for (const v of childrenMap[u] || []) {
          if (!visited.has(v)) {
            visited.add(v);
            treeChildren[u].push(v);
            treeChildren[v] = [];
            queue.push(v);
          }
        }
      }

      // Add any unvisited disconnected components as additional roots
      levelNodes.forEach(n => {
        if (!visited.has(n)) {
          roots.push(n);
          treeChildren[n] = [];
          visited.add(n);
        }
      });

      // Calculate recursive subtree bounding heights
      const subtreeHeight: Record<string, number> = {};
      const calcSubtreeHeight = (u: string): number => {
        const isCollapsed = collapsedNodes.has(u);
        const children = (!isCollapsed && treeChildren[u]) ? treeChildren[u] : [];
        if (children.length === 0) {
          subtreeHeight[u] = leafHeight;
          return leafHeight;
        }
        let total = 0;
        children.forEach(v => {
          total += calcSubtreeHeight(v);
        });
        subtreeHeight[u] = Math.max(leafHeight, total);
        return subtreeHeight[u];
      };

      roots.forEach(r => calcSubtreeHeight(r));

      // Assign hierarchical Mind Map coordinates (parent Y centered on children)
      let levelMaxDepth = 0;
      const assignPositions = (u: string, depth: number, yTop: number) => {
        if (depth > levelMaxDepth) levelMaxDepth = depth;
        const x = leftMargin + depth * colWidth;
        const isCollapsed = collapsedNodes.has(u);
        const totalChildCount = (childrenMap[u] || []).length;
        const visibleChildren = (!isCollapsed && treeChildren[u]) ? treeChildren[u] : [];

        if (visibleChildren.length === 0) {
          const y = yTop + subtreeHeight[u] / 2;
          computedCoords[u] = {
            id: u,
            level: lvl,
            x,
            y,
            depth,
            hasChildren: totalChildCount > 0,
            childCount: totalChildCount,
            isCollapsed,
          };
          return;
        }

        let childYTop = yTop;
        visibleChildren.forEach(v => {
          assignPositions(v, depth + 1, childYTop);
          childYTop += subtreeHeight[v];
        });

        const firstChildY = computedCoords[visibleChildren[0]].y;
        const lastChildY = computedCoords[visibleChildren[visibleChildren.length - 1]].y;
        const y = (firstChildY + lastChildY) / 2;

        computedCoords[u] = {
          id: u,
          level: lvl,
          x,
          y,
          depth,
          hasChildren: true,
          childCount: totalChildCount,
          isCollapsed,
        };
      };

      const bandStart = currentY;
      let bandCurrentY = bandStart + 55; // room for level header banner

      roots.forEach(r => {
        assignPositions(r, 0, bandCurrentY);
        bandCurrentY += subtreeHeight[r] + 25;
      });

      if (levelMaxDepth > globalMaxDepth) globalMaxDepth = levelMaxDepth;

      const levelTotalContentHeight = bandCurrentY - bandStart;
      const bandHeight = displayedLevels.length === 1
        ? Math.max(380, levelTotalContentHeight + 40)
        : Math.max(260, levelTotalContentHeight + 30);

      const yStart = bandStart;
      const yEnd = yStart + bandHeight;

      computedBands.push({
        name: lvl,
        branchCount: levelBranches.length,
        nodeCount: levelNodes.length,
        yStart,
        yEnd,
        height: bandHeight,
        color: bandPalettes[lvlIdx % bandPalettes.length].bg,
        borderColor: bandPalettes[lvlIdx % bandPalettes.length].border,
      });

      currentY = yEnd + 35;
    });

    const calculatedSvgWidth = Math.max(1050, leftMargin + (globalMaxDepth + 1) * colWidth + rightMargin);
    const calculatedSvgHeight = currentY + 15;

    return {
      actualLevels: allActualLevels,
      levelBands: computedBands,
      nodeCoords: computedCoords,
      svgWidth: calculatedSvgWidth,
      svgHeight: calculatedSvgHeight,
    };
  }, [branches, activeLevelFilter, collapsedNodes]);

  // Lookup results by branch_id
  const resultsMap = useMemo(() => {
    const map = new Map<string, BranchSizingResult>();
    results.forEach(r => map.set(r.branch_id, r));
    return map;
  }, [results]);

  const selectedResult = selectedBranchId ? resultsMap.get(selectedBranchId) : null;
  const selectedBranch = selectedBranchId ? branches.find(b => b.branch_id === selectedBranchId) : null;

  // Extract cables routed through selected branch
  const routedCables: CableRoutedDetail[] = useMemo(() => {
    if (!selectedResult) return [];
    if (selectedResult.cables_detail && selectedResult.cables_detail.length > 0) {
      return selectedResult.cables_detail;
    }
    if (selectedResult.cables_routed && selectedResult.cables_routed.length > 0) {
      const map = new Map<string, Cable>();
      cables.forEach(c => map.set(c.cable_tag, c));
      return selectedResult.cables_routed.map(tag => {
        const c = map.get(tag);
        return {
          cable_tag: tag,
          source_node: c?.source_node || '',
          dest_node: c?.dest_node || '',
          cable_type: c?.cable_type || '',
          od_mm: c?.od_mm || 0,
          count: c?.count || 1,
          width_contribution_mm: 0,
          source_panel: c?.source_panel,
          dest_panel: c?.dest_panel,
        };
      });
    }
    return [];
  }, [selectedResult, cables]);

  const filteredRoutedCables = useMemo(() => {
    if (!cableSearchQuery.trim()) return routedCables;
    const q = cableSearchQuery.trim().toLowerCase();
    return routedCables.filter(c =>
      c.cable_tag.toLowerCase().includes(q) ||
      c.cable_type.toLowerCase().includes(q) ||
      c.source_node.toLowerCase().includes(q) ||
      c.dest_node.toLowerCase().includes(q) ||
      (c.source_panel && c.source_panel.toLowerCase().includes(q)) ||
      (c.dest_panel && c.dest_panel.toLowerCase().includes(q))
    );
  }, [routedCables, cableSearchQuery]);

  if (!branches || branches.length === 0) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3 py-8">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Layers className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No Tray Segments Defined</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Add cable tray segments in the Branches table above to visualize the physical multi-level plant routing and riser connections.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Layers className="h-5 w-5 text-blue-600" />
              Plant Tray & Riser Mind Map
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Interactive hierarchical tree. Click any node to expand or collapse its downstream branches. Click any segment to inspect sizing.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Level Filter Buttons */}
            {actualLevels.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <Button
                  variant={activeLevelFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={() => setActiveLevelFilter('all')}
                >
                  All Levels ({actualLevels.length})
                </Button>
                {actualLevels.map(lvl => (
                  <Button
                    key={lvl}
                    variant={activeLevelFilter === lvl ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2.5 text-xs font-medium font-mono"
                    onClick={() => setActiveLevelFilter(lvl)}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            )}

            {/* Mind Map Expand / Collapse Actions */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-700 hover:bg-white flex items-center gap-1"
                onClick={handleExpandAll}
                title="Expand all branches"
              >
                <FolderOpen className="h-3.5 w-3.5 text-blue-600" />
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-700 hover:bg-white flex items-center gap-1"
                onClick={handleCollapseAll}
                title="Collapse to root feeders"
              >
                <FolderClosed className="h-3.5 w-3.5 text-amber-600" />
                Collapse All
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-700 hover:bg-white"
                onClick={() => setZoom(prev => Math.max(0.5, parseFloat((prev - 0.15).toFixed(2))))}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <button
                type="button"
                className="px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 hover:text-blue-600"
                onClick={() => setZoom(1.0)}
                title="Reset Zoom to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-700 hover:bg-white"
                onClick={() => setZoom(prev => Math.min(2.0, parseFloat((prev + 0.15).toFixed(2))))}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              {(zoom !== 1.0 || activeLevelFilter !== 'all' || collapsedNodes.size > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-600 hover:bg-white flex items-center gap-1"
                  onClick={() => {
                    setZoom(1.0);
                    setActiveLevelFilter('all');
                    setCollapsedNodes(new Set());
                  }}
                  title="Reset Everything"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>

            {/* Color Status Legend */}
            <div className="hidden xl:flex items-center gap-2.5 text-xs text-slate-600 pl-2 border-l border-slate-200">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" /> Normal (&lt;70%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" /> Loaded (70-90%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" /> Overfill (&gt;90%)
              </span>
              <span className="flex items-center gap-1 text-purple-700 font-medium">
                <MoveVertical className="h-3 w-3" /> Riser
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="relative w-full overflow-x-auto overflow-y-auto bg-slate-950/5 rounded-xl border border-slate-200 p-3 min-h-[440px] max-h-[720px]">
            <div
              style={{
                width: `${Math.round(svgWidth * zoom)}px`,
                height: `${Math.round(svgHeight * zoom)}px`,
                minWidth: '100%',
              }}
            >
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                width="100%"
                height="100%"
                className="select-none"
              >
                <defs>
                  <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#94A3B8" opacity="0.3" />
                  </pattern>
                </defs>

                {/* Level Elevation Background Bands */}
                {levelBands.map((band, idx) => {
                  const statsText = `${band.branchCount} segments • ${band.nodeCount} nodes`;
                  const nameWidth = Math.max(72, Math.round(band.name.length * 8.5 + 20));
                  const statsWidth = Math.round(statsText.length * 6.8 + 20);
                  const totalPillWidth = nameWidth + statsWidth + 18;
                  const startX = 30;
                  const chipX = startX + 3;

                  return (
                    <g key={idx}>
                      <rect
                        x="20"
                        y={band.yStart}
                        width={svgWidth - 40}
                        height={band.height}
                        rx="12"
                        fill={band.color}
                        stroke={band.borderColor}
                        strokeWidth="1.5"
                      />
                      <rect
                        x="20"
                        y={band.yStart}
                        width={svgWidth - 40}
                        height={band.height}
                        rx="12"
                        fill="url(#dotGrid)"
                      />

                      {/* Unified Level Header Pill */}
                      <rect
                        x={startX}
                        y={band.yStart + 12}
                        width={totalPillWidth}
                        height="28"
                        rx="7"
                        fill="#FFFFFF"
                        stroke="#CBD5E1"
                        strokeWidth="1"
                        className="shadow-2xs"
                      />

                      {/* Level Name Tag Pill */}
                      <rect
                        x={chipX}
                        y={band.yStart + 15}
                        width={nameWidth}
                        height="22"
                        rx="5"
                        fill="#F1F5F9"
                        stroke="#E2E8F0"
                        strokeWidth="0.5"
                      />
                      <text
                        x={chipX + nameWidth / 2}
                        y={band.yStart + 30}
                        textAnchor="middle"
                        fill="#0F172A"
                        fontSize="11.5"
                        fontWeight="bold"
                        className="font-mono tracking-wide select-none"
                      >
                        {band.name}
                      </text>

                      {/* Segments and Nodes Count Stats */}
                      <text
                        x={chipX + nameWidth + 10}
                        y={band.yStart + 30}
                        fill="#64748B"
                        fontSize="11"
                        fontWeight="500"
                        className="select-none"
                      >
                        {statsText}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Mind Map Branches (Curved Bezier Edges) */}
                {branches.map(b => {
                  const c1 = nodeCoords[b.node_from];
                  const c2 = nodeCoords[b.node_to];
                  // If either endpoint is collapsed / hidden, do not draw
                  if (!c1 || !c2) return null;

                  const res = resultsMap.get(b.branch_id);
                  const isSelected = selectedBranchId === b.branch_id;
                  const isVertical = b.branch_type === 'vertical' || b.level.toLowerCase().includes('transition') || c1.level !== c2.level;

                  let strokeColor = '#94A3B8'; // default slate
                  if (res) {
                    if (res.fill_ratio_pct > 90) strokeColor = '#EF4444';
                    else if (res.fill_ratio_pct > 70) strokeColor = '#F59E0B';
                    else if (res.cable_count > 0) strokeColor = '#10B981';
                  }

                  if (isVertical) {
                    strokeColor = res && res.fill_ratio_pct > 90 ? '#DC2626' : '#8B5CF6';
                  }

                  const strokeW = isSelected ? 4.5 : isVertical ? 3 : 2.5;

                  // Mind Map smooth cubic bezier curve
                  const dx = Math.max(45, Math.abs(c2.x - c1.x) * 0.45);
                  const pathData = isVertical
                    ? `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y}`
                    : `M ${c1.x} ${c1.y} C ${c1.x + dx} ${c1.y}, ${c2.x - dx} ${c2.y}, ${c2.x} ${c2.y}`;

                  const midX = (c1.x + c2.x) / 2;
                  const midY = (c1.y + c2.y) / 2;
                  const badgeWidth = Math.max(56, b.branch_id.length * 7.2 + 12);
                  const badgeHeight = 20;

                  return (
                    <g
                      key={b.branch_id}
                      onClick={() => setSelectedBranchId(b.branch_id)}
                      className="cursor-pointer group"
                    >
                      {/* Thick transparent hover hitbox */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="20"
                      />

                      {/* Visible curved branch line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeW}
                        strokeDasharray={isVertical ? '6,4' : undefined}
                        className="transition-all duration-200 group-hover:opacity-80"
                      />

                      {/* Branch Label Badge at Midpoint */}
                      <rect
                        x={midX - badgeWidth / 2}
                        y={midY - badgeHeight / 2}
                        width={badgeWidth}
                        height={badgeHeight}
                        rx="4"
                        fill="#FFFFFF"
                        stroke={isSelected ? '#2563EB' : isVertical ? '#C084FC' : '#CBD5E1'}
                        strokeWidth={isSelected ? '2' : '1'}
                        className="shadow-sm"
                      />
                      <text
                        x={midX}
                        y={midY + 3.5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="bold"
                        fill={isSelected ? '#1D4ED8' : isVertical ? '#6B21A8' : '#334155'}
                        className="font-mono select-none"
                      >
                        {b.branch_id}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Mind Map Nodes (Circles, Labels & Expand/Collapse Toggle Badges) */}
                {Object.values(nodeCoords).map(n => {
                  const labelWidth = Math.max(46, n.id.length * 7.5 + 14);

                  return (
                    <g key={n.id} className="transition-transform duration-200">
                      {/* Node Circle */}
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r="10"
                        fill={n.isCollapsed ? '#2563EB' : '#0F172A'}
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        className="shadow-sm cursor-pointer"
                        onClick={() => toggleNodeCollapse(n.id)}
                      />

                      {/* Node Label Pill below circle */}
                      <g className="cursor-pointer" onClick={() => toggleNodeCollapse(n.id)}>
                        <rect
                          x={n.x - labelWidth / 2}
                          y={n.y + 13}
                          width={labelWidth}
                          height="17"
                          rx="4"
                          fill="#FFFFFF"
                          fillOpacity="0.95"
                          stroke={n.isCollapsed ? '#93C5FD' : '#E2E8F0'}
                          strokeWidth="1"
                          className="shadow-xs"
                        />
                        <text
                          x={n.x}
                          y={n.y + 25.5}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="bold"
                          fill={n.isCollapsed ? '#1D4ED8' : '#0F172A'}
                          className="font-mono select-none"
                        >
                          {n.id}
                        </text>
                      </g>

                      {/* Interactive Expand / Collapse Toggle Badge */}
                      {n.hasChildren && (
                        <g
                          className="cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNodeCollapse(n.id);
                          }}
                        >
                          {n.isCollapsed ? (
                            // Collapsed state: highlight badge with "+ childCount"
                            <g>
                              <rect
                                x={n.x + 13}
                                y={n.y - 10}
                                width={Math.max(26, String(n.childCount).length * 8 + 14)}
                                height="20"
                                rx="10"
                                fill="#2563EB"
                                stroke="#FFFFFF"
                                strokeWidth="2"
                                className="shadow-md"
                              />
                              <text
                                x={n.x + 13 + Math.max(26, String(n.childCount).length * 8 + 14) / 2}
                                y={n.y + 3.5}
                                textAnchor="middle"
                                fill="#FFFFFF"
                                fontSize="10"
                                fontWeight="bold"
                                className="font-mono select-none"
                              >
                                +{n.childCount}
                              </text>
                            </g>
                          ) : (
                            // Expanded state: subtle "-" toggle pill
                            <g>
                              <circle
                                cx={n.x + 15}
                                cy={n.y}
                                r="7.5"
                                fill="#F8FAFC"
                                stroke="#94A3B8"
                                strokeWidth="1.5"
                                className="group-hover:stroke-blue-600 group-hover:fill-blue-50 transition-colors"
                              />
                              <line
                                x1={n.x + 12}
                                y1={n.y}
                                x2={n.x + 18}
                                y2={n.y}
                                stroke="#475569"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="group-hover:stroke-blue-600"
                              />
                            </g>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Selected Branch Inspection Drawer */}
          {selectedBranch && (
            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3.5 relative animate-in fade-in-50 duration-200 shadow-sm">
              {/* Top Row: Segment Metadata & KPIs */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pr-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      Segment: {selectedBranch.branch_id}
                    </span>
                    <Badge variant={selectedBranch.branch_type === 'vertical' ? 'riser' : 'secondary'} className="text-[10px]">
                      {selectedBranch.branch_type.toUpperCase()} ({selectedBranch.level})
                    </Badge>
                    {selectedResult && (
                      <Badge variant={selectedResult.status === 'OK' ? 'success' : 'destructive'} className="text-[10px]">
                        {selectedResult.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Span: <span className="font-semibold text-slate-900 font-mono">{selectedBranch.node_from}</span> ➔ <span className="font-semibold text-slate-900 font-mono">{selectedBranch.node_to}</span> ({selectedBranch.length_m} m length)
                  </p>
                </div>

                {selectedResult ? (
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-500 block">Cables Routed:</span>
                      <span className="font-bold text-slate-800 text-sm">{selectedResult.cable_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Calculated Width:</span>
                      <span className="font-bold text-slate-800 text-sm font-mono">{selectedResult.calculated_width_mm} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Commercial Tray:</span>
                      <span className="font-bold text-blue-600 text-sm font-mono">W: {selectedResult.recommended_commercial_width_mm} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fill Ratio:</span>
                      <span className={`font-bold text-sm font-mono ${
                        selectedResult.fill_ratio_pct > 90 ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {selectedResult.fill_ratio_pct}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">
                    Run calculation engine to view sizing for this segment.
                  </div>
                )}
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 absolute top-3 right-3"
                onClick={() => setSelectedBranchId(null)}
                title="Close Inspector"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Routed Cables Section */}
              {selectedResult && (
                <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                      onClick={() => setIsCablesExpanded(prev => !prev)}
                    >
                      <CableIcon className="h-4 w-4 text-blue-600" />
                      <span>Cables in this Segment ({routedCables.length})</span>
                      {isCablesExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>

                    {isCablesExpanded && routedCables.length > 3 && (
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={cableSearchQuery}
                          onChange={e => setCableSearchQuery(e.target.value)}
                          placeholder="Search cable tag / type..."
                          className="h-7 w-full pl-8 pr-2.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  {isCablesExpanded && (
                    routedCables.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        No cables currently routed through this tray segment.
                      </p>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                        <div className="max-h-60 overflow-y-auto">
                          <Table className="text-xs">
                            <TableHeader className="bg-slate-100/90 sticky top-0 z-10">
                              <TableRow className="border-b border-slate-200">
                                <TableHead className="h-8 font-semibold text-slate-700 py-1.5 pl-3 whitespace-nowrap">Cable Tag</TableHead>
                                <TableHead className="h-8 font-semibold text-slate-700 py-1.5 whitespace-nowrap">Type / Specification</TableHead>
                                <TableHead className="h-8 font-semibold text-slate-700 py-1.5 text-right whitespace-nowrap">OD</TableHead>
                                <TableHead className="h-8 font-semibold text-slate-700 py-1.5 text-center whitespace-nowrap">Qty</TableHead>
                                <TableHead className="h-8 font-semibold text-slate-700 py-1.5 whitespace-nowrap">Full Cable Span</TableHead>
                                <TableHead className="h-8 font-semibold text-slate-700 py-1.5 whitespace-nowrap">Equipment / Panels</TableHead>
                                <TableHead className="h-8 font-semibold text-slate-700 py-1.5 text-right pr-3 whitespace-nowrap">Width Footprint</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRoutedCables.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center py-4 text-xs text-slate-500">
                                    No cables match "{cableSearchQuery}"
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredRoutedCables.map((c, idx) => (
                                  <TableRow
                                    key={c.cable_tag || idx}
                                    className={`border-b border-slate-100 last:border-0 ${idx % 2 === 1 ? 'bg-slate-50/70 hover:bg-slate-100/70' : 'bg-white hover:bg-slate-50/70'}`}
                                  >
                                    <TableCell className="font-mono font-bold text-blue-600 py-1.5 pl-3">
                                      {c.cable_tag}
                                    </TableCell>
                                    <TableCell className="text-slate-800 py-1.5 font-medium">
                                      {c.cable_type || '-'}
                                    </TableCell>
                                    <TableCell className="font-mono text-right text-slate-700 py-1.5">
                                      {c.od_mm ? `${c.od_mm} mm` : '-'}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-slate-700 py-1.5">
                                      {c.count}
                                    </TableCell>
                                    <TableCell className="font-mono text-slate-600 py-1.5">
                                      {c.source_node} ➔ {c.dest_node}
                                    </TableCell>
                                    <TableCell className="text-slate-600 py-1.5 text-[11px]">
                                      {c.source_panel || c.dest_panel ? (
                                        <span>{c.source_panel || '-'} ➔ {c.dest_panel || '-'}</span>
                                      ) : (
                                        <span className="text-slate-400 italic">None</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-mono text-right font-semibold text-slate-800 py-1.5 pr-3">
                                      {c.width_contribution_mm ? `${c.width_contribution_mm} mm` : '-'}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
