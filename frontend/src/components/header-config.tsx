'use client';

import React from 'react';
import { CalculationParameters } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  Play,
  Layers,
  Folder,
  FolderPlus,
  Trash2,
  Settings,
} from 'lucide-react';
import { Project } from '@/lib/types';
import { AutoTrayLogo } from '@/components/autotray-logo';

interface HeaderConfigProps {
  parameters?: CalculationParameters;
  onChangeParameters?: (params: CalculationParameters) => void;
  onOpenMappingModal: () => void;
  onOpenDefaultsTab?: () => void;
  onOpenSettings?: () => void;
  onDownloadSampleTemplate?: () => void;
  onLoadDemoData?: () => void;
  onCalculate: () => void;
  isCalculating: boolean;
  projects?: Project[];
  activeProject?: Project | null;
  onSelectProject?: (id: string) => void;
  onOpenNewProjectModal?: () => void;
  onDeleteProject?: (id: string) => void;
}

export function HeaderConfig({
  parameters,
  onChangeParameters,
  onOpenMappingModal,
  onOpenDefaultsTab,
  onOpenSettings,
  onDownloadSampleTemplate,
  onLoadDemoData,
  onCalculate,
  isCalculating,
  projects = [],
  activeProject = null,
  onSelectProject,
  onOpenNewProjectModal,
  onDeleteProject,
}: HeaderConfigProps) {
  const handleOpenSettings = onOpenSettings || onOpenDefaultsTab;

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Project Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center p-1 shadow-sm">
              <AutoTrayLogo size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  AutoTray-Router
                </h1>
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-[10px]">
                  v1.0 Pro
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Industrial Cable Tray & Multi-Level Riser Sizing Engine
              </p>
            </div>
          </div>

          {/* Project Switcher Pill */}
          {activeProject && (
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/90 px-2.5 py-1 rounded-lg ml-0 sm:ml-2">
              <Folder className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <select
                value={activeProject.id}
                onChange={e => onSelectProject?.(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1 max-w-[180px] truncate"
                title={activeProject.name}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>

              {onOpenNewProjectModal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenNewProjectModal}
                  className="h-6 px-1.5 text-[11px] text-blue-700 hover:bg-blue-200/60 font-semibold gap-1 ml-1"
                  title="Create new empty project"
                >
                  <FolderPlus className="w-3 h-3" />
                  New
                </Button>
              )}

              {projects.length > 1 && onDeleteProject && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete project "${activeProject.name}"?`)) {
                      onDeleteProject(activeProject.id);
                    }
                  }}
                  className="h-6 px-1 text-[11px] text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Delete current project"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMappingModal}
            className="text-xs h-9 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
            Upload Excel & Map Columns
          </Button>

          <Button
            size="sm"
            onClick={onCalculate}
            disabled={isCalculating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm transition"
          >
            <Play className={`h-3.5 w-3.5 mr-1.5 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Routing & Sizing...' : 'Calculate Sizing'}
          </Button>

          {handleOpenSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSettings}
              className="text-xs h-9 text-slate-700 hover:bg-slate-100 border-slate-200"
              title="Open Project & Calculation Settings"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
              Settings
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
