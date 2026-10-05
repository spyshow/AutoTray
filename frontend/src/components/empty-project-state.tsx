'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileSpreadsheet,
  Plus,
  Layers,
  Cable as CableIcon,
  Sparkles,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';

interface EmptyProjectStateProps {
  projectName: string;
  projectCode: string;
  onOpenUpload: (scope?: 'both' | 'cables_only' | 'branches_only') => void;
  onAddBranchManually: () => void;
  onAddCableManually: () => void;
  onLoadDemoData: () => void;
}

export function EmptyProjectState({
  projectName,
  projectCode,
  onOpenUpload,
  onAddBranchManually,
  onAddCableManually,
  onLoadDemoData,
}: EmptyProjectStateProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center my-6 max-w-4xl mx-auto">
      <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
        <FolderOpen className="w-7 h-7" />
      </div>

      <div className="inline-block px-2.5 py-0.5 mb-2 text-xs font-mono font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
        {projectCode}
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {projectName} is currently empty
      </h2>
      <p className="text-xs text-slate-500 max-w-md mx-auto mb-8">
        Your project database has been created with clean slate parameters. Start engineering your cable tray system by adding cables, nodes, and tray branches.
      </p>

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
        {/* Card 1: Import Excel */}
        <div className="border border-slate-200 hover:border-blue-300 rounded-lg p-4 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">Smart Excel / CSV Import</h3>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Upload your engineering workbooks with auto-detected headers, fuzzy column mapping, and default OD resolution.
            </p>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
            <Button
              size="sm"
              onClick={() => onOpenUpload('both')}
              className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 h-auto"
            >
              Upload Excel Workbook
            </Button>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenUpload('cables_only')}
                className="flex-1 text-[11px] py-1 h-auto text-slate-700"
              >
                Cables Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenUpload('branches_only')}
                className="flex-1 text-[11px] py-1 h-auto text-slate-700"
              >
                Branches Only
              </Button>
            </div>
          </div>
        </div>

        {/* Card 2: Manual Row Entry */}
        <div className="border border-slate-200 hover:border-blue-300 rounded-lg p-4 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">Manual Interactive Entry</h3>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Add tray segments, vertical risers, and cables interactively using inline-editable spreadsheet tables.
            </p>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddBranchManually}
              className="w-full text-xs text-blue-700 hover:bg-blue-50 border-blue-200 font-medium py-1 h-auto gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              + Add First Branch / Riser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddCableManually}
              className="w-full text-xs text-blue-700 hover:bg-blue-50 border-blue-200 font-medium py-1 h-auto gap-1.5"
            >
              <CableIcon className="w-3.5 h-3.5" />
              + Add First Cable
            </Button>
          </div>
        </div>

        {/* Card 3: Demo Template */}
        <div className="border border-slate-200 hover:border-blue-300 rounded-lg p-4 bg-slate-50/50 hover:bg-amber-50/30 transition-all flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">Load Industrial Demo</h3>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Quickly populate this project with an authentic 3-level industrial refinery transition (18 branches, 42 cables).
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200/60">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadDemoData}
              className="w-full text-xs text-amber-800 border-amber-300 hover:bg-amber-100/60 font-semibold py-1.5 h-auto gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Populate Demo Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
