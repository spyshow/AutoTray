'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CalculationParameters,
  Branch,
  Cable,
  CalculationResponse,
  Project,
} from '@/lib/types';
import { DEFAULT_PARAMETERS, SAMPLE_BRANCHES, SAMPLE_CABLES } from '@/lib/sample-data';
import {
  getStoredProjects,
  saveStoredProjects,
  getStoredActiveProjectId,
  setStoredActiveProjectId,
  createNewProject,
  createDemoProject,
  updateStoredProject,
  deleteStoredProject,
} from '@/lib/project-storage';
import { HeaderConfig } from '@/components/header-config';
import { KpiCards } from '@/components/kpi-cards';
import { ResultsTable } from '@/components/results-table';
import { CablesTable } from '@/components/cables-table';
import { BranchesTable } from '@/components/branches-table';
import { NetworkGraphView } from '@/components/network-graph-view';
import { MappingModal } from '@/components/mapping-modal';
import { DefaultsSettingsTab } from '@/components/defaults-settings-tab';
import { BomTab } from '@/components/bom-tab';
import { ProjectModal } from '@/components/project-modal';
import { MissingSpecOdModal } from '@/components/missing-spec-od-modal';
import { EmptyProjectState } from '@/components/empty-project-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { calculateSizingApi, exportExcelApi, downloadSampleTemplateApi } from '@/lib/api';
import { solveRoutingAndSizingClient } from '@/lib/client-calculator';
import { lookupCatalogCableOd } from '@/lib/cable-catalog';
import { createSampleWorkbookBlob, normalizeCableSpec } from '@/lib/excel';
import {
  LayoutDashboard,
  Cable as CableIcon,
  Layers,
  Network,
  AlertTriangle,
  Sliders,
  Package,
  Settings,
} from 'lucide-react';

export default function AutoTrayRouterPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);

  const [parameters, setParameters] = useState<CalculationParameters>(DEFAULT_PARAMETERS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cables, setCables] = useState<Cable[]>([]);
  const [calculationResult, setCalculationResult] = useState<CalculationResponse | null>(null);

  const [activeTab, setActiveTab] = useState<string>('branches');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [initialMappingScope, setInitialMappingScope] = useState<'both' | 'cables_only' | 'branches_only'>('both');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMissingSpecModalOpen, setIsMissingSpecModalOpen] = useState(false);
  const [missingSpecTarget, setMissingSpecTarget] = useState<string | undefined>(undefined);

  const isMountedRef = useRef(false);

  // 1. Initial Load: Check localStorage for existing projects
  useEffect(() => {
    const loadedProjects = getStoredProjects();
    setProjects(loadedProjects);

    if (loadedProjects.length === 0) {
      // Prompt user to start with a clean project or explore demo
      setIsInitialSetup(true);
      setIsProjectModalOpen(true);
    } else {
      const activeId = getStoredActiveProjectId();
      const match = loadedProjects.find(p => p.id === activeId) || loadedProjects[0];
      switchActiveProject(match);
    }
    isMountedRef.current = true;
  }, []);

  const switchActiveProject = (proj: Project) => {
    setActiveProject(proj);
    setStoredActiveProjectId(proj.id);
    setParameters(proj.parameters || DEFAULT_PARAMETERS);
    setBranches(proj.branches || []);
    setCables(proj.cables || []);
  };

  // 2. Persist project changes whenever parameters, branches, or cables update
  useEffect(() => {
    if (!isMountedRef.current || !activeProject) return;

    updateStoredProject(activeProject.id, {
      parameters,
      branches,
      cables,
    });

    setProjects(prev =>
      prev.map(p =>
        p.id === activeProject.id
          ? { ...p, parameters, branches, cables, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, [parameters, branches, cables, activeProject?.id]);

  // 3. Calculation Runner
  const runCalculation = useCallback(async () => {
    if (branches.length === 0 && cables.length === 0) {
      setCalculationResult(null);
      return;
    }

    setIsCalculating(true);
    setErrorMessage(null);
    try {
      try {
        const res = await calculateSizingApi({
          parameters,
          branches,
          cables,
        });
        setCalculationResult(res);
      } catch (backendErr) {
        // Fallback to high-performance client-side graph engine
        const fallbackRes = solveRoutingAndSizingClient(parameters, branches, cables);
        setCalculationResult(fallbackRes);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while calculating tray sizing.');
    } finally {
      setIsCalculating(false);
    }
  }, [parameters, branches, cables]);

  // Auto-recalculate when branches, cables, or parameters change
  useEffect(() => {
    if (isMountedRef.current) {
      runCalculation();
    }
  }, [runCalculation]);

  // Project Management Handlers
  const handleCreateProject = (name: string, code: string, description: string) => {
    const newProj = createNewProject(name, code, description, DEFAULT_PARAMETERS);
    setProjects(getStoredProjects());
    switchActiveProject(newProj);
    setIsInitialSetup(false);
    setActiveTab('branches');
  };

  const handleLoadDemoProject = () => {
    const demoProj = createDemoProject();
    setProjects(getStoredProjects());
    switchActiveProject(demoProj);
    setIsInitialSetup(false);
    setActiveTab('results');
  };

  const handleDeleteProject = (id: string) => {
    deleteStoredProject(id);
    const remaining = getStoredProjects();
    setProjects(remaining);
    if (remaining.length > 0) {
      switchActiveProject(remaining[0]);
    } else {
      setActiveProject(null);
      setBranches([]);
      setCables([]);
      setCalculationResult(null);
      setIsInitialSetup(true);
      setIsProjectModalOpen(true);
    }
  };

  const handlePopulateCurrentProjectWithDemo = () => {
    setBranches(JSON.parse(JSON.stringify(SAMPLE_BRANCHES)));
    setCables(JSON.parse(JSON.stringify(SAMPLE_CABLES)));
    setActiveTab('results');
  };

  // Cable and Branch modifications
  const handleUpdateCable = (index: number, updated: Cable) => {
    const next = [...cables];
    next[index] = updated;
    setCables(next);
  };

  const handleAddCable = (cable: Cable) => {
    setCables(prev => [...prev, cable]);
    setActiveTab('cables');
  };

  const handleDeleteCable = (index: number) => {
    const next = [...cables];
    next.splice(index, 1);
    setCables(next);
  };

  const handleDeleteMultipleCables = (indices: number[]) => {
    const toDelete = new Set(indices);
    const next = cables.filter((_, idx) => !toDelete.has(idx));
    setCables(next);
  };

  const handleDeleteAllCables = () => {
    setCables([]);
  };

  const handleUpdateBranch = (index: number, updated: Branch) => {
    const next = [...branches];
    next[index] = updated;
    setBranches(next);
  };

  const handleAddBranch = (branch: Branch) => {
    setBranches(prev => [...prev, branch]);
    setActiveTab('branches');
  };

  const handleDeleteBranch = (index: number) => {
    const next = [...branches];
    next.splice(index, 1);
    setBranches(next);
  };

  const handleDeleteMultipleBranches = (indices: number[]) => {
    const toDelete = new Set(indices);
    const next = branches.filter((_, idx) => !toDelete.has(idx));
    setBranches(next);
  };

  const handleDeleteAllBranches = () => {
    setBranches([]);
  };

  const handleDownloadSampleTemplate = async () => {
    try {
      const blob = await downloadSampleTemplateApi();
      triggerBlobDownload(blob, 'AutoTray_Engineering_Template.xlsx');
    } catch {
      const fallbackBlob = createSampleWorkbookBlob();
      triggerBlobDownload(fallbackBlob, 'AutoTray_Engineering_Template.xlsx');
    }
  };

  const handleExportExcel = async () => {
    if (!calculationResult) return;
    setIsExporting(true);
    try {
      const blob = await exportExcelApi(calculationResult);
      triggerBlobDownload(blob, `${activeProject?.code || 'AutoTray'}_Sizing_BOM_Report.xlsx`);
    } catch {
      alert('Backend export endpoint unavailable. Ensure the FastAPI server is running at http://localhost:8000.');
    } finally {
      setIsExporting(false);
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleImportComplete = (importedCables: Cable[], importedBranches: Branch[]) => {
    if (importedCables.length > 0) setCables(importedCables);
    if (importedBranches.length > 0) setBranches(importedBranches);

    // If any imported cables have missing specs not in rules/catalog, open the MissingSpecOdModal
    const customRules = parameters.custom_od_by_type || {};
    const unconfigured = importedCables.filter(c => {
      const rawSpec = String(c.cable_type || '').trim();
      if (!rawSpec) return false;
      const spec = normalizeCableSpec(rawSpec) || rawSpec;
      return !customRules[spec] && !customRules[rawSpec] && !lookupCatalogCableOd(spec) && !lookupCatalogCableOd(rawSpec);
    });

    if (unconfigured.length > 0) {
      setTimeout(() => {
        setMissingSpecTarget(undefined);
        setIsMissingSpecModalOpen(true);
      }, 400);
    }

    setTimeout(() => {
      runCalculation();
    }, 150);
  };

  const handleSaveMissingSpecRules = (newRules: Record<string, number>, updatedCables: Cable[]) => {
    setParameters(prev => ({
      ...prev,
      custom_od_by_type: newRules,
    }));
    setCables(updatedCables);
    setTimeout(() => {
      runCalculation();
    }, 100);
  };

  const isProjectEmpty = branches.length === 0 && cables.length === 0;

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 pb-12 flex flex-col">
      {/* Top Header & Sizing Parameters Bar */}
      <HeaderConfig
        parameters={parameters}
        onChangeParameters={setParameters}
        onOpenMappingModal={() => {
          setInitialMappingScope('both');
          setIsMappingModalOpen(true);
        }}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenDefaultsTab={() => setActiveTab('settings')}
        onDownloadSampleTemplate={handleDownloadSampleTemplate}
        onLoadDemoData={handlePopulateCurrentProjectWithDemo}
        onCalculate={() => {
          runCalculation();
          setActiveTab('results');
        }}
        isCalculating={isCalculating}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={id => {
          const match = projects.find(p => p.id === id);
          if (match) switchActiveProject(match);
        }}
        onOpenNewProjectModal={() => {
          setIsInitialSetup(false);
          setIsProjectModalOpen(true);
        }}
        onDeleteProject={handleDeleteProject}
      />

      {/* Main Workspace Container */}
      <main className="max-w-7xl w-full mx-auto px-4 mt-6 flex-1">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Empty State Banner if current project has no data */}
        {activeProject && isProjectEmpty ? (
          <EmptyProjectState
            projectName={activeProject.name}
            projectCode={activeProject.code}
            onOpenUpload={scope => {
              setInitialMappingScope(scope || 'both');
              setIsMappingModalOpen(true);
            }}
            onAddBranchManually={() => {
              handleAddBranch({
                branch_id: 'BR_L1_01',
                node_from: 'MCC_L1',
                node_to: 'JUNC_01',
                level: 'Level 1',
                branch_type: 'horizontal',
                length_m: 10.0,
                tray_height_mm: parameters.default_tray_height_mm,
              });
              setActiveTab('branches');
            }}
            onAddCableManually={() => {
              handleAddCable({
                cable_tag: 'C_PWR_01',
                source_node: 'MCC_L1',
                dest_node: 'JUNC_01',
                cable_type: 'power',
                od_mm: parameters.default_power_od_mm,
                count: 1,
              });
              setActiveTab('cables');
            }}
            onLoadDemoData={handlePopulateCurrentProjectWithDemo}
          />
        ) : (
          /* Executive KPI Cards */
          <KpiCards
            summary={calculationResult?.summary || null}
            diagnostics={calculationResult?.diagnostics || null}
          />
        )}

        {/* Tabs Workspace - Reordered to Natural Project & Data Filling Flow */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 mt-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto gap-2">
            <TabsList className="bg-white border border-slate-200 shadow-sm p-1 flex-wrap h-auto">
              {/* STEP 1: Branches & Risers */}
              <TabsTrigger
                value="branches"
                className="text-xs gap-1.5 font-semibold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                1. Branches &amp; Risers ({branches.length})
              </TabsTrigger>

              {/* STEP 2: Cables Schedule */}
              <TabsTrigger
                value="cables"
                className="text-xs gap-1.5 font-semibold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <CableIcon className="h-3.5 w-3.5 text-blue-600" />
                2. Cables Schedule ({cables.length})
              </TabsTrigger>

              {/* STEP 3: Multi-Level Plant Topology */}
              <TabsTrigger
                value="graph"
                className="text-xs gap-1.5 font-semibold data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700"
              >
                <Network className="h-3.5 w-3.5 text-purple-600" />
                3. Multi-Level Plant Topology
              </TabsTrigger>

              {/* STEP 4: Sizing Results Dashboard */}
              <TabsTrigger
                value="results"
                className="text-xs gap-1.5 font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-600" />
                4. Sizing Results Dashboard
              </TabsTrigger>

              {/* STEP 5: Bill of Materials (BOM) */}
              <TabsTrigger
                value="bom"
                className="text-xs gap-1.5 font-semibold data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800"
              >
                <Package className="h-3.5 w-3.5 text-amber-600" />
                5. Bill of Materials (BOM)
              </TabsTrigger>
            </TabsList>

            {/* Dedicated Settings Tab */}
            <TabsList className="bg-white border border-slate-200 shadow-sm p-1 h-auto flex-shrink-0">
              <TabsTrigger
                value="settings"
                className="text-xs gap-1.5 font-semibold data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"
                title="Configure sizing parameters, rules, and handbook catalog"
              >
                <Settings className="h-3.5 w-3.5 text-slate-600" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: Branches & Risers Table */}
          <TabsContent value="branches">
            <BranchesTable
              branches={branches}
              defaultTrayHeight={parameters.default_tray_height_mm}
              onUpdateBranch={handleUpdateBranch}
              onAddBranch={handleAddBranch}
              onDeleteBranch={handleDeleteBranch}
              onDeleteMultipleBranches={handleDeleteMultipleBranches}
              onDeleteAllBranches={handleDeleteAllBranches}
            />
          </TabsContent>

          {/* TAB 2: Cables Schedule Table */}
          <TabsContent value="cables">
            <CablesTable
              cables={cables}
              branches={branches}
              routingResults={calculationResult?.cables || []}
              onUpdateCable={handleUpdateCable}
              onAddCable={handleAddCable}
              onDeleteCable={handleDeleteCable}
              onDeleteMultipleCables={handleDeleteMultipleCables}
              onDeleteAllCables={handleDeleteAllCables}
              parameters={parameters}
              onOpenMissingSpecModal={spec => {
                setMissingSpecTarget(spec);
                setIsMissingSpecModalOpen(true);
              }}
            />
          </TabsContent>

          {/* TAB 3: Network Topology Graph */}
          <TabsContent value="graph">
            <NetworkGraphView
              branches={branches}
              results={calculationResult?.branches || []}
              cables={cables}
            />
          </TabsContent>

          {/* TAB 4: Sizing Results Dashboard */}
          <TabsContent value="results">
            <ResultsTable
              data={calculationResult?.branches || []}
              onExportExcel={handleExportExcel}
              isExporting={isExporting}
            />
          </TabsContent>

          {/* TAB 5: Bill of Materials (BOM) */}
          <TabsContent value="bom">
            <BomTab
              bom={calculationResult?.bom}
              parameters={parameters}
              onExportExcel={handleExportExcel}
              isExporting={isExporting}
            />
          </TabsContent>

          {/* SETTINGS TAB: Sizing Parameters, Project Tools & Handbook Catalog */}
          <TabsContent value="settings">
            <DefaultsSettingsTab
              parameters={parameters}
              onChangeParameters={setParameters}
              onApplyAndRecalculate={runCalculation}
              onLoadDemoData={handlePopulateCurrentProjectWithDemo}
              onDownloadSampleTemplate={handleDownloadSampleTemplate}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dynamic Column Mapping Modal */}
      <MappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        onImportComplete={handleImportComplete}
        defaultTrayHeight={parameters.default_tray_height_mm}
        parameters={parameters}
      />

      {/* Create / Select Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
        onLoadDemoProject={handleLoadDemoProject}
        isInitialSetup={isInitialSetup}
      />

      {/* Modal for entering missing cable spec ODs */}
      <MissingSpecOdModal
        isOpen={isMissingSpecModalOpen}
        onClose={() => {
          setIsMissingSpecModalOpen(false);
          setMissingSpecTarget(undefined);
        }}
        cables={cables}
        parameters={parameters}
        onSave={handleSaveMissingSpecRules}
        initialSpec={missingSpecTarget}
      />
    </div>
  );
}
