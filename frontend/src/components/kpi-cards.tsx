'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalculationSummary, Diagnostics } from '@/lib/types';
import { Network, Cable, AlertTriangle, Layers, Activity, CheckCircle2 } from 'lucide-react';

interface KpiCardsProps {
  summary: CalculationSummary | null;
  diagnostics: Diagnostics | null;
}

export function KpiCards({ summary, diagnostics }: KpiCardsProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-slate-200 bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="h-10 w-10 bg-slate-100 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const unroutedCount = summary.unrouted_cables?.length || 0;
  const isOverfilled = summary.overfilled_branches_count > 0;
  const hasDiagIssues = (diagnostics?.missing_nodes_referenced_in_cables?.length || 0) > 0 ||
                        (diagnostics?.disconnected_nodes?.length || 0) > 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Cables Routed */}
      <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cables Routed
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {summary.total_cables_routed}
              </span>
              {unroutedCount > 0 ? (
                <Badge variant="destructive" className="text-[10px]">
                  {unroutedCount} unrouted
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 100% Routed
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary.total_cable_length_routed_m} m total route
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Cable className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Branches / Segments */}
      <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tray Segments
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {summary.total_branches}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {summary.total_tray_length_m} m span
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Multi-level network & risers
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Max Fill Ratio % */}
      <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Peak Fill Ratio
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${
                summary.max_fill_pct > 90 ? 'text-red-600' : summary.max_fill_pct > 75 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {summary.max_fill_pct}%
              </span>
              {summary.max_fill_branch_id && (
                <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                  {summary.max_fill_branch_id}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary.max_fill_pct > 90 ? 'High loading warning' : 'Within engineering capacity'}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl ${
            summary.max_fill_pct > 90 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <Activity className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Overfilled / Integrity Warnings */}
      <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Design Warnings
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${
                isOverfilled || hasDiagIssues ? 'text-amber-600' : 'text-slate-900'
              }`}>
                {summary.overfilled_branches_count}
              </span>
              {summary.overfilled_branches_count > 0 ? (
                <Badge variant="destructive" className="text-[10px]">
                  &gt; 900mm Split Req
                </Badge>
              ) : hasDiagIssues ? (
                <Badge variant="warning" className="text-[10px]">
                  Node Issues
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px]">
                  Zero Errors
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isOverfilled ? 'Requires double tier tray' : 'All standard trays fit'}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl ${
            isOverfilled || hasDiagIssues ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
