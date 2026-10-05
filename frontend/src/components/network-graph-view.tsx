'use client';

import React, { useState, useMemo } from 'react';
import { Branch, BranchSizingResult, Cable } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Activity, MoveVertical, ShieldAlert, CheckCircle2 } from 'lucide-react';

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
}

export function NetworkGraphView({ branches, results, cables }: NetworkGraphViewProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Group nodes by level and compute layout coordinates
  const { nodeCoords, levelBands } = useMemo(() => {
    const nodesByLevel: Record<string, Set<string>> = {
      'Level 1': new Set(),
      'Level 2': new Set(),
      'Level 3': new Set(),
      'Other': new Set(),
    };

    branches.forEach(b => {
      const lvl = b.level.toLowerCase();
      let targetLvl = 'Level 1';
      if (lvl.includes('3')) targetLvl = 'Level 3';
      else if (lvl.includes('2')) targetLvl = 'Level 2';
      else if (lvl.includes('1')) targetLvl = 'Level 1';
      else if (lvl.includes('trans') || b.branch_type === 'vertical') {
        // Riser endpoints: if node has L1, L2, L3 in its name, assign appropriately
        const fromL = b.node_from.toLowerCase();
        const toL = b.node_to.toLowerCase();
        if (fromL.includes('l1') || fromL.includes('transf')) nodesByLevel['Level 1'].add(b.node_from);
        if (fromL.includes('l2')) nodesByLevel['Level 2'].add(b.node_from);
        if (fromL.includes('l3')) nodesByLevel['Level 3'].add(b.node_from);
        if (toL.includes('l1')) nodesByLevel['Level 1'].add(b.node_to);
        if (toL.includes('l2')) nodesByLevel['Level 2'].add(b.node_to);
        if (toL.includes('l3')) nodesByLevel['Level 3'].add(b.node_to);
        return;
      }

      nodesByLevel[targetLvl].add(b.node_from);
      nodesByLevel[targetLvl].add(b.node_to);
    });

    const coords: Record<string, NodeCoord> = {};
    const width = 860;
    const levelOrder = ['Level 3', 'Level 2', 'Level 1'];
    const bands: { name: string; yStart: number; yEnd: number; color: string }[] = [
      { name: 'Level 3 (Mezzanine / Roof)', yStart: 40, yEnd: 180, color: 'rgba(238, 242, 255, 0.6)' },
      { name: 'Level 2 (Mixing / Pumps)', yStart: 210, yEnd: 360, color: 'rgba(240, 249, 255, 0.6)' },
      { name: 'Level 1 (Substation / MCC)', yStart: 390, yEnd: 540, color: 'rgba(248, 250, 252, 0.8)' },
    ];

    levelOrder.forEach((lvlName, lIdx) => {
      const nodeList = Array.from(nodesByLevel[lvlName] || []);
      const count = nodeList.length;
      const yCenter = 110 + lIdx * 180;
      const xSpacing = count > 1 ? (width - 160) / (count - 1) : 0;

      nodeList.forEach((nId, idx) => {
        coords[nId] = {
          id: nId,
          level: lvlName,
          x: count === 1 ? width / 2 : 80 + idx * xSpacing,
          y: yCenter + (idx % 2 === 1 ? -25 : 25),
        };
      });
    });

    // Catch any remaining nodes not in Level 1..3
    const allKnown = new Set(Object.keys(coords));
    branches.forEach(b => {
      if (!allKnown.has(b.node_from)) {
        coords[b.node_from] = { id: b.node_from, level: b.level, x: 100, y: 500 };
      }
      if (!allKnown.has(b.node_to)) {
        coords[b.node_to] = { id: b.node_to, level: b.level, x: 200, y: 500 };
      }
    });

    return { nodeCoords: coords, levelBands: bands };
  }, [branches]);

  // Lookup results by branch_id
  const resultsMap = useMemo(() => {
    const map = new Map<string, BranchSizingResult>();
    results.forEach(r => map.set(r.branch_id, r));
    return map;
  }, [results]);

  const selectedResult = selectedBranchId ? resultsMap.get(selectedBranchId) : null;
  const selectedBranch = selectedBranchId ? branches.find(b => b.branch_id === selectedBranchId) : null;

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Layers className="h-5 w-5 text-blue-600" />
              Multi-Level Plant Tray & Riser Topology
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Interactive elevation map. Color coding reflects sizing fill ratio % (Green &lt; 70%, Amber 70-90%, Red &gt; 90%). Click any segment to inspect.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Normal (&lt;70%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Loaded (70-90%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Overfill (&gt;90%)
            </span>
            <span className="flex items-center gap-1 text-purple-700">
              <MoveVertical className="h-3 w-3" /> Vertical Riser
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="relative w-full overflow-x-auto bg-slate-950/5 rounded-xl border border-slate-200 p-2">
            <svg
              viewBox="0 0 880 580"
              className="w-full h-auto min-w-[750px] select-none"
              style={{ maxHeight: '560px' }}
            >
              {/* Level Elevation Background Bands */}
              {levelBands.map((band, idx) => (
                <g key={idx}>
                  <rect
                    x="20"
                    y={band.yStart}
                    width="840"
                    height={band.yEnd - band.yStart}
                    rx="8"
                    fill={band.color}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                  />
                  <text
                    x="35"
                    y={band.yStart + 22}
                    fill="#475569"
                    fontSize="11"
                    fontWeight="bold"
                    letterSpacing="0.05em"
                  >
                    {band.name}
                  </text>
                </g>
              ))}

              {/* Draw Branches (Lines) */}
              {branches.map(b => {
                const c1 = nodeCoords[b.node_from];
                const c2 = nodeCoords[b.node_to];
                if (!c1 || !c2) return null;

                const res = resultsMap.get(b.branch_id);
                const isSelected = selectedBranchId === b.branch_id;
                const isVertical = b.branch_type === 'vertical' || b.level.toLowerCase().includes('transition');

                let strokeColor = '#94A3B8'; // default slate
                if (res) {
                  if (res.fill_ratio_pct > 90) strokeColor = '#EF4444';
                  else if (res.fill_ratio_pct > 70) strokeColor = '#F59E0B';
                  else if (res.cable_count > 0) strokeColor = '#10B981';
                }

                if (isVertical) {
                  strokeColor = res && res.fill_ratio_pct > 90 ? '#DC2626' : '#8B5CF6';
                }

                const strokeW = isSelected ? 5 : isVertical ? 3.5 : 3;

                return (
                  <g
                    key={b.branch_id}
                    onClick={() => setSelectedBranchId(b.branch_id)}
                    className="cursor-pointer group"
                  >
                    {/* Hover hitbox */}
                    <line
                      x1={c1.x}
                      y1={c1.y}
                      x2={c2.x}
                      y2={c2.y}
                      stroke="transparent"
                      strokeWidth="16"
                    />
                    {/* Visible line */}
                    <line
                      x1={c1.x}
                      y1={c1.y}
                      x2={c2.x}
                      y2={c2.y}
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeDasharray={isVertical ? '5,4' : undefined}
                      className="transition-all duration-200 group-hover:opacity-80"
                    />
                    {/* Branch Label Badge */}
                    <rect
                      x={(c1.x + c2.x) / 2 - 28}
                      y={(c1.y + c2.y) / 2 - 10}
                      width="56"
                      height="20"
                      rx="4"
                      fill="#FFFFFF"
                      stroke={isSelected ? '#2563EB' : '#CBD5E1'}
                      strokeWidth={isSelected ? '2' : '1'}
                    />
                    <text
                      x={(c1.x + c2.x) / 2}
                      y={(c1.y + c2.y) / 2 + 3.5}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={isSelected ? '#1D4ED8' : '#334155'}
                      className="font-mono"
                    >
                      {b.branch_id.length > 8 ? b.branch_id.substring(0, 8) : b.branch_id}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes (Circles & Labels) */}
              {Object.values(nodeCoords).map(n => (
                <g key={n.id} className="transition-transform duration-200">
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="8"
                    fill="#1E293B"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    className="shadow-sm"
                  />
                  <text
                    x={n.x}
                    y={n.y + 19}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="600"
                    fill="#0F172A"
                    className="font-mono drop-shadow-sm pointer-events-none"
                  >
                    {n.id}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Selected Branch Inspection Drawer */}
          {selectedBranch && (
            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                  Span: <span className="font-semibold text-slate-900">{selectedBranch.node_from}</span> ➔ <span className="font-semibold text-slate-900">{selectedBranch.node_to}</span> ({selectedBranch.length_m} m length)
                </p>
              </div>

              {selectedResult ? (
                <div className="flex items-center gap-6 text-xs">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
