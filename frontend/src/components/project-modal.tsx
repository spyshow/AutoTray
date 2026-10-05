'use client';

import React, { useState } from 'react';
import { Project, CalculationParameters } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FolderPlus, Layers, FileSpreadsheet, Building2, Sparkles } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, code: string, description: string) => void;
  onLoadDemoProject: () => void;
  isInitialSetup?: boolean;
}

export function ProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  onLoadDemoProject,
  isInitialSetup = false,
}: ProjectModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }
    const generatedCode = code.trim() || `PRJ-${Math.floor(100 + Math.random() * 900)}`;
    onCreateProject(name.trim(), generatedCode, description.trim());
    setName('');
    setCode('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && !isInitialSetup && onClose()}>
      <DialogContent className="max-w-lg bg-white border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isInitialSetup ? 'Welcome to AutoTray-Router' : 'Create New Project'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {isInitialSetup
                  ? 'Start with an empty database to engineer your own cable tray system, or explore with demo data.'
                  : 'Start a new sizing and routing project with a clean, empty workspace.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Substation Expansion - Train B"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              className="text-xs focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Project Code / Tag</label>
              <Input
                type="text"
                placeholder="e.g. PRJ-2026-001"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="text-xs font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Starting Status</label>
              <div className="h-9 px-3 flex items-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md font-semibold">
                Clean Empty Database
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Description / Area Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Facility units, voltage levels, elevation transitions, or client notes..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 h-auto gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Create Empty Project & Start
            </Button>

            {isInitialSetup && (
              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-400 font-medium">Or explore the engine first:</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onLoadDemoProject();
                    onClose();
                  }}
                  className="w-full mt-1.5 text-xs text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200 gap-1.5 py-1.5 h-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Load Sample Industrial Demo Project (3-Level Riser, 42 Cables)
                </Button>
              </div>
            )}
          </div>
        </form>

        {!isInitialSetup && (
          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
