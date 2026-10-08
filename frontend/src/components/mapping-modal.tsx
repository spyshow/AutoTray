'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  parseExcelFile,
  autoDetectCablesMapping,
  autoDetectBranchesMapping,
  guessCableCategory,
  mapRawDataToCables,
  mapRawDataToBranches,
  detectHasIecDesignations,
} from '@/lib/excel';
import { Cable, Branch, CableCategory, CalculationParameters } from '@/lib/types';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Table as TableIcon,
  Layers,
  FileUp,
  FileText,
  Cable as CableIcon,
  Sparkles,
  Check,
} from 'lucide-react';

interface MappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (cables: Cable[], branches: Branch[]) => void;
  defaultTrayHeight: number;
  parameters?: CalculationParameters;
}

export function MappingModal({
  isOpen,
  onClose,
  onImportComplete,
  defaultTrayHeight,
  parameters,
}: MappingModalProps) {
  const [importScope, setImportScope] = useState<'both' | 'cables_only' | 'branches_only'>('both');
  const [uploadMode, setUploadMode] = useState<'single' | 'separate'>('single');
  const [activeStep, setActiveStep] = useState<'upload' | 'sheets' | 'mapping' | 'types'>('upload');

  // Single file mode
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetsData, setSheetsData] = useState<Record<string, any[][]>>({});

  // Separate files mode
  const [cablesFileName, setCablesFileName] = useState<string>('');
  const [branchesFileName, setBranchesFileName] = useState<string>('');
  const [cablesSheetNames, setCablesSheetNames] = useState<string[]>([]);
  const [branchesSheetNames, setBranchesSheetNames] = useState<string[]>([]);
  const [cablesSheetsData, setCablesSheetsData] = useState<Record<string, any[][]>>({});
  const [branchesSheetsData, setBranchesSheetsData] = useState<Record<string, any[][]>>({});

  // Selected sheets
  const [cablesSheet, setCablesSheet] = useState<string>('');
  const [branchesSheet, setBranchesSheet] = useState<string>('');

  // Column mappings
  const [cableMappings, setCableMappings] = useState({
    cableTagCol: '',
    cableSourceCol: '',
    cableDestCol: '',
    cableSourcePanelCol: '',
    cableDestPanelCol: '',
    cableTypeCol: '',
    cableCoresCol: '',
    cableSizeCol: '',
    cableOdCol: '',
    cableCountCol: '',
  });

  // IEC 81346 smart node normalization
  const [hasIecTags, setHasIecTags] = useState(false);
  const [normalizeIecNodes, setNormalizeIecNodes] = useState(true);
  const [groupByDropPoint, setGroupByDropPoint] = useState(true);

  const [branchMappings, setBranchMappings] = useState({
    branchIdCol: '',
    branchFromCol: '',
    branchToCol: '',
    branchLevelCol: '',
    branchTypeCol: '',
    branchLengthCol: '',
    branchHeightCol: '',
  });

  // Type normalization
  const [uniqueRawTypes, setUniqueRawTypes] = useState<string[]>([]);
  const [typeCategoryMap, setTypeCategoryMap] = useState<Record<string, CableCategory>>({});

  // 1. Single Workbook Upload
  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFileName(uploadedFile.name);
    const buffer = await uploadedFile.arrayBuffer();
    const parsed = parseExcelFile(buffer);

    setSheetNames(parsed.sheetNames);
    setSheetsData(parsed.sheets);

    const lowerSheets = parsed.sheetNames.map(s => s.toLowerCase());
    const cIdx = lowerSheets.findIndex(s => s.includes('cable') || s.includes('wire'));
    const bIdx = lowerSheets.findIndex(s => s.includes('branch') || s.includes('tray') || s.includes('route'));

    const selCables = cIdx !== -1 ? parsed.sheetNames[cIdx] : parsed.sheetNames[0] || '';
    const selBranches = bIdx !== -1 ? parsed.sheetNames[bIdx] : (parsed.sheetNames[1] || parsed.sheetNames[0] || '');

    setCablesSheet(selCables);
    setBranchesSheet(selBranches);

    setActiveStep('sheets');
  };

  // 2. Separate Files Upload
  const handleCablesFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setCablesFileName(uploadedFile.name);
    const buffer = await uploadedFile.arrayBuffer();
    const parsed = parseExcelFile(buffer);

    setCablesSheetNames(parsed.sheetNames);
    setCablesSheetsData(parsed.sheets);
    setCablesSheet(parsed.sheetNames[0] || '');
  };

  const handleBranchesFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setBranchesFileName(uploadedFile.name);
    const buffer = await uploadedFile.arrayBuffer();
    const parsed = parseExcelFile(buffer);

    setBranchesSheetNames(parsed.sheetNames);
    setBranchesSheetsData(parsed.sheets);
    setBranchesSheet(parsed.sheetNames[0] || '');
  };

  const getActiveCablesData = (): any[][] => {
    if (uploadMode === 'separate') {
      return cablesSheetsData[cablesSheet] || [];
    }
    return sheetsData[cablesSheet] || [];
  };

  const getActiveBranchesData = (): any[][] => {
    if (uploadMode === 'separate') {
      return branchesSheetsData[branchesSheet] || [];
    }
    return sheetsData[branchesSheet] || [];
  };

  const getCablesHeaders = (): string[] => {
    const data = getActiveCablesData();
    if (!data || data.length === 0) return [];
    return data[0].map(h => String(h || '').trim()).filter(Boolean);
  };

  const getBranchesHeaders = (): string[] => {
    const data = getActiveBranchesData();
    if (!data || data.length === 0) return [];
    return data[0].map(h => String(h || '').trim()).filter(Boolean);
  };

  const getPreviewRows = (data: any[][]) => {
    if (!data || data.length <= 1) return [];
    return data.slice(1, 6);
  };

  // Run auto-detection when entering mapping step
  const proceedToMapping = () => {
    if (importScope !== 'branches_only') {
      const cHeaders = getCablesHeaders();
      const cData = getActiveCablesData();
      const isIec = detectHasIecDesignations(cData);
      setHasIecTags(isIec);
      setNormalizeIecNodes(isIec);
      const autoC = autoDetectCablesMapping(cHeaders);
      setCableMappings(autoC);
    }

    if (importScope !== 'cables_only') {
      const bHeaders = getBranchesHeaders();
      const autoB = autoDetectBranchesMapping(bHeaders);
      setBranchMappings(autoB);
    }

    setActiveStep('mapping');
  };

  // Scan unique types for normalization
  const proceedToTypeNormalization = () => {
    const cData = getActiveCablesData();
    const headers = getCablesHeaders();
    const typeIdx = headers.indexOf(cableMappings.cableTypeCol);

    const typesSet = new Set<string>();
    if (cData && typeIdx !== -1) {
      for (let r = 1; r < cData.length; r++) {
        const val = cData[r]?.[typeIdx];
        if (val !== undefined && String(val).trim() !== '') {
          typesSet.add(String(val).trim());
        }
      }
    }

    const typesArr = Array.from(typesSet);
    setUniqueRawTypes(typesArr);

    const initialMap: Record<string, CableCategory> = {};
    typesArr.forEach(t => {
      initialMap[t] = guessCableCategory(t);
    });
    setTypeCategoryMap(initialMap);

    setActiveStep('types');
  };

  const handleApplyImport = () => {
    const defaultOdMap = parameters ? {
      power: parameters.default_power_od_mm,
      control: parameters.default_control_od_mm,
      signal: parameters.default_signal_od_mm,
      data: parameters.default_data_od_mm,
      global: parameters.default_global_od_mm,
      custom: parameters.custom_od_by_type,
    } : undefined;

    let mappedCables: Cable[] = [];
    let mappedBranches: Branch[] = [];

    if (importScope !== 'branches_only') {
      const rawCablesData = getActiveCablesData();
      mappedCables = mapRawDataToCables(
        rawCablesData,
        0,
        cableMappings,
        typeCategoryMap,
        defaultOdMap,
        {
          normalizeIecNodes,
          groupByDropPoint,
        }
      );
    }

    if (importScope !== 'cables_only') {
      const rawBranchesData = getActiveBranchesData();
      mappedBranches = mapRawDataToBranches(
        rawBranchesData,
        0,
        branchMappings,
        defaultTrayHeight,
        parameters?.default_mounting_type || 'ceiling_trapeze'
      );
    }

    onImportComplete(mappedCables, mappedBranches);
    onClose();
  };

  const canProceedFromUpload = () => {
    if (uploadMode === 'single') {
      return Boolean(fileName);
    }
    if (importScope === 'cables_only') {
      return Boolean(cablesFileName);
    }
    if (importScope === 'branches_only') {
      return Boolean(branchesFileName);
    }
    return Boolean(cablesFileName || branchesFileName);
  };

  const stepSequence: Array<{ id: 'upload' | 'sheets' | 'mapping' | 'types'; num: number; label: string }> = [
    { id: 'upload', num: 1, label: 'Upload File(s)' },
    { id: 'sheets', num: 2, label: 'Sheet Selection & Preview' },
    { id: 'mapping', num: 3, label: 'Column Mapping' },
    ...(importScope !== 'branches_only'
      ? [{ id: 'types' as const, num: 4, label: 'Type Normalization' }]
      : []),
  ];

  const currentStepIndex = stepSequence.findIndex(s => s.id === activeStep);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl lg:max-w-5xl p-6 max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            Smart Excel Import &amp; Dynamic Column Mapper
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Upload custom Excel workbooks or CSV files. Upload cables only, branches only, or both together.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 overflow-x-auto gap-2">
          {stepSequence.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-2 shrink-0 ${isActive ? 'text-blue-600 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] transition-all ${
                      isCompleted
                        ? 'bg-blue-600 text-white font-bold'
                        : isActive
                        ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-100 shadow-xs'
                        : 'bg-slate-100 text-slate-500 font-medium'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3 stroke-[2.5]" /> : step.num}
                  </span>
                  <span className="text-[11px] tracking-wide">{step.label}</span>
                </div>
                {idx < stepSequence.length - 1 && (
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isCompleted ? 'text-blue-500' : 'text-slate-300'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1: Upload */}
        {activeStep === 'upload' && (
          <div className="space-y-4">
            {/* Import Target Scope Selector */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">What would you like to upload?</span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                <Button
                  variant={importScope === 'both' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setImportScope('both')}
                  className="text-xs gap-1.5 h-8"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Both (Cables &amp; Branches)
                </Button>
                <Button
                  variant={importScope === 'cables_only' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setImportScope('cables_only')}
                  className="text-xs gap-1.5 h-8"
                >
                  <CableIcon className="h-3.5 w-3.5" />
                  Cables Only
                </Button>
                <Button
                  variant={importScope === 'branches_only' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setImportScope('branches_only')}
                  className="text-xs gap-1.5 h-8"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Branches Only
                </Button>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center justify-center gap-2 pb-1">
              <Button
                variant={uploadMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('single')}
                className="text-xs gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Single Workbook (Multi-Sheet or CSV)
              </Button>
              <Button
                variant={uploadMode === 'separate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('separate')}
                className="text-xs gap-1.5"
              >
                <FileUp className="h-4 w-4" />
                Separate File(s)
              </Button>
            </div>

            {uploadMode === 'single' ? (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <Upload className="h-12 w-12 text-blue-500 mb-3" />
                <p className="font-semibold text-slate-700 mb-1 text-base">
                  {importScope === 'cables_only'
                    ? 'Select Cables Schedule (.xlsx, .xls, .csv)'
                    : importScope === 'branches_only'
                    ? 'Select Branches & Risers Network (.xlsx, .xls, .csv)'
                    : 'Select Excel Workbook (.xlsx, .xls, .csv)'}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {importScope === 'cables_only'
                    ? 'Upload cable list with tags, endpoints, and optional outer diameters'
                    : importScope === 'branches_only'
                    ? 'Upload tray segments with from/to nodes, elevation levels, and lengths'
                    : 'Contains sheets for Cables, Branches, or both with arbitrary column names'}
                </p>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition">
                    <FileSpreadsheet className="h-4 w-4" />
                    Browse Computer
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleSingleFileUpload}
                  />
                </label>
                {fileName && (
                  <div className="mt-3 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Selected: {fileName}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cables File */}
                {importScope !== 'branches_only' && (
                  <div className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center ${importScope === 'cables_only' ? 'md:col-span-2' : ''}`}>
                    <FileText className="h-9 w-9 text-blue-500 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm mb-1">Cables Schedule File</p>
                    <p className="text-xs text-slate-500 mb-3">.xlsx, .xls, or .csv (OD is optional)</p>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 shadow-sm transition">
                        <Upload className="h-3.5 w-3.5" />
                        Select Cables File
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleCablesFileUpload}
                      />
                    </label>
                    {cablesFileName && (
                      <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {cablesFileName}
                      </div>
                    )}
                  </div>
                )}

                {/* Branches File */}
                {importScope !== 'cables_only' && (
                  <div className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center ${importScope === 'branches_only' ? 'md:col-span-2' : ''}`}>
                    <TableIcon className="h-9 w-9 text-emerald-500 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm mb-1">Branches &amp; Risers File</p>
                    <p className="text-xs text-slate-500 mb-3">.xlsx, .xls, or .csv</p>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700 shadow-sm transition">
                        <Upload className="h-3.5 w-3.5" />
                        Select Branches File
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleBranchesFileUpload}
                      />
                    </label>
                    {branchesFileName && (
                      <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {branchesFileName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Sheet Selection & Live 5-Row Previews */}
        {activeStep === 'sheets' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className={`grid ${importScope === 'both' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {importScope !== 'branches_only' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sheet for Cables Schedule:
                  </label>
                  <select
                    value={cablesSheet}
                    onChange={e => setCablesSheet(e.target.value)}
                    className="w-full text-sm rounded border border-slate-300 bg-white p-2"
                  >
                    {(uploadMode === 'separate' ? cablesSheetNames : sheetNames).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {importScope !== 'cables_only' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sheet for Trays / Branches:
                  </label>
                  <select
                    value={branchesSheet}
                    onChange={e => setBranchesSheet(e.target.value)}
                    className="w-full text-sm rounded border border-slate-300 bg-white p-2"
                  >
                    {(uploadMode === 'separate' ? branchesSheetNames : sheetNames).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Live 5-Row Preview: Cables */}
            {importScope !== 'branches_only' && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CableIcon className="h-3.5 w-3.5 text-blue-600" />
                    Live Preview: Cables Sheet [{cablesSheet}] (First 5 Rows)
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {getActiveCablesData().length ? `${getActiveCablesData().length - 1} records` : '0 rows'}
                  </Badge>
                </div>
                <div className="overflow-x-auto max-h-36 text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {getCablesHeaders().map((h, i) => (
                          <th key={i} className="p-2 text-left font-semibold text-slate-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getPreviewRows(getActiveCablesData()).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={`border-b border-slate-100 ${rIdx % 2 === 1 ? 'bg-slate-50/70 hover:bg-slate-100/70' : 'bg-white hover:bg-slate-50/70'}`}
                        >
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="p-2 text-slate-700 whitespace-nowrap">
                              {String(cell ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Live 5-Row Preview: Branches */}
            {importScope !== 'cables_only' && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <TableIcon className="h-3.5 w-3.5 text-emerald-600" />
                    Live Preview: Branches Sheet [{branchesSheet}] (First 5 Rows)
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {getActiveBranchesData().length ? `${getActiveBranchesData().length - 1} records` : '0 rows'}
                  </Badge>
                </div>
                <div className="overflow-x-auto max-h-36 text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {getBranchesHeaders().map((h, i) => (
                          <th key={i} className="p-2 text-left font-semibold text-slate-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getPreviewRows(getActiveBranchesData()).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={`border-b border-slate-100 ${rIdx % 2 === 1 ? 'bg-slate-50/70 hover:bg-slate-100/70' : 'bg-white hover:bg-slate-50/70'}`}
                        >
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="p-2 text-slate-700 whitespace-nowrap">
                              {String(cell ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Dynamic Column Mapping */}
        {activeStep === 'mapping' && (
          <div className="space-y-4 max-h-[66vh] overflow-y-auto pr-1.5">
            {/* Cables Column Mapping */}
            {importScope !== 'branches_only' && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Cables Target Schema Mapping</h3>
                      <p className="text-[11px] text-slate-500">Map spreadsheet columns to cable identifiers, technical sizing, and routing endpoints</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50 font-medium">
                    Sheet: {cablesSheet}
                  </Badge>
                </div>

                {/* Group 1: Routing Endpoints & Enclosures (Symmetrical 2x2 Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Origin / Source Box */}
                  <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/25 space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        <span className="text-xs font-bold text-slate-800">Origin (Source / FROM)</span>
                      </div>
                      <span className="text-[10px] text-blue-700 font-medium bg-blue-100/70 px-1.5 py-0.5 rounded">
                        From Endpoint
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between h-5 text-xs">
                          <label className="font-semibold text-slate-700">
                            Source Node <span className="text-red-500">*</span>:
                          </label>
                          <span className="text-[10px] text-amber-600 font-medium">Required</span>
                        </div>
                        <select
                          value={cableMappings.cableSourceCol}
                          onChange={e => setCableMappings({ ...cableMappings, cableSourceCol: e.target.value })}
                          className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">-- Select Column --</option>
                          {getCablesHeaders().map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between h-5 text-xs">
                          <label className="font-semibold text-slate-700">
                            Source Panel:
                          </label>
                          <span className="text-[10px] text-slate-400 font-normal">(e.g. P101)</span>
                        </div>
                        <select
                          value={cableMappings.cableSourcePanelCol}
                          onChange={e => setCableMappings({ ...cableMappings, cableSourcePanelCol: e.target.value })}
                          className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">-- None / In Source --</option>
                          {getCablesHeaders().map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Destination / Dest Box */}
                  <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/25 space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                        <span className="text-xs font-bold text-slate-800">Destination (Target / TO)</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100/70 px-1.5 py-0.5 rounded">
                        To Endpoint
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between h-5 text-xs">
                          <label className="font-semibold text-slate-700">
                            Dest Node <span className="text-red-500">*</span>:
                          </label>
                          <span className="text-[10px] text-amber-600 font-medium">Required</span>
                        </div>
                        <select
                          value={cableMappings.cableDestCol}
                          onChange={e => setCableMappings({ ...cableMappings, cableDestCol: e.target.value })}
                          className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">-- Select Column --</option>
                          {getCablesHeaders().map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between h-5 text-xs">
                          <label className="font-semibold text-slate-700">
                            Dest Panel:
                          </label>
                          <span className="text-[10px] text-slate-400 font-normal">(e.g. P181)</span>
                        </div>
                        <select
                          value={cableMappings.cableDestPanelCol}
                          onChange={e => setCableMappings({ ...cableMappings, cableDestPanelCol: e.target.value })}
                          className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">-- None / In Dest --</option>
                          {getCablesHeaders().map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 2: Cable Specification & Physical Sizing */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CableIcon className="h-3.5 w-3.5 text-blue-600" />
                      Cable Identification &amp; Technical Dimensions
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                      Catalog automatically resolves OD when Spec or Cores/Size is mapped
                    </span>
                  </div>

                  {/* Primary Row: Tag, Spec, OD (3 columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Cable Tag / ID <span className="text-red-500">*</span>:
                        </label>
                        <span className="text-[10px] text-amber-600 font-medium">Required</span>
                      </div>
                      <select
                        value={cableMappings.cableTagCol}
                        onChange={e => setCableMappings({ ...cableMappings, cableTagCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Select Column --</option>
                        {getCablesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Cable Spec / Type:
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal">(e.g. 4x1.5 mm²)</span>
                      </div>
                      <select
                        value={cableMappings.cableTypeCol}
                        onChange={e => setCableMappings({ ...cableMappings, cableTypeCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Select Column --</option>
                        {getCablesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Outer Diameter (mm):
                        </label>
                        <span className="text-[10px] text-blue-600 font-medium">Auto-Lookup</span>
                      </div>
                      <select
                        value={cableMappings.cableOdCol}
                        onChange={e => setCableMappings({ ...cableMappings, cableOdCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Auto-Lookup Catalog/Defaults --</option>
                        {getCablesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Secondary Row: Disaggregated Cores & Size + Explanatory Tip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/60">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          No. of Cores:
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal">(Optional, e.g. 4)</span>
                      </div>
                      <select
                        value={cableMappings.cableCoresCol}
                        onChange={e => setCableMappings({ ...cableMappings, cableCoresCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- None / In Spec --</option>
                        {getCablesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Conductor Size (mm²):
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal">(Optional, e.g. 1.5)</span>
                      </div>
                      <select
                        value={cableMappings.cableSizeCol}
                        onChange={e => setCableMappings({ ...cableMappings, cableSizeCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- None / In Spec --</option>
                        {getCablesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-white/80 border border-slate-200 rounded-md text-[11px] text-slate-500 self-end h-9">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="leading-tight">
                        Optional if cores &amp; size are already inside Cable Spec (e.g. 4x1.5).
                      </span>
                    </div>
                  </div>
                </div>

                {/* IEC 81346 Smart Normalization Banner */}
                {(hasIecTags || cableMappings.cableSourcePanelCol || cableMappings.cableDestPanelCol) && (
                  <div className="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-blue-900">IEC 81346 Reference Designations</span>
                      </div>
                      <Badge className={`${normalizeIecNodes ? 'bg-blue-600 hover:bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'} text-[10px] px-2 py-0.5`}>
                        {normalizeIecNodes ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer text-slate-700 bg-white/70 hover:bg-white p-2.5 rounded-lg border border-blue-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={normalizeIecNodes}
                        onChange={e => setNormalizeIecNodes(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="leading-relaxed">
                        <strong>Enable Smart Node Normalization</strong>: Internal cabinet devices (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px] font-semibold text-slate-700">+M-</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px] font-semibold text-slate-700">+F-</code>) automatically collapse to their parent Panel (<code className="font-bold text-blue-700">P181</code>). Field devices (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px] font-semibold text-slate-700">+E-</code>) group by physical equipment drop point (<code className="font-bold text-blue-700">E-7E1</code>, <code className="font-bold text-blue-700">E-46E1</code>).
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Branches Column Mapping */}
            {importScope !== 'cables_only' && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <TableIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Branches / Risers Target Schema Mapping</h3>
                      <p className="text-[11px] text-slate-500">Map spreadsheet columns to cable tray run segments, elevation levels, and geometry</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 font-medium">
                    Sheet: {branchesSheet}
                  </Badge>
                </div>

                {/* Group 1: Tray Trajectory & Endpoints (3 columns) */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Trajectory &amp; Network Endpoints
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Identifies tray segments &amp; routing junctions</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Branch ID <span className="text-red-500">*</span>:
                        </label>
                        <span className="text-[10px] text-amber-600 font-medium">Required</span>
                      </div>
                      <select
                        value={branchMappings.branchIdCol}
                        onChange={e => setBranchMappings({ ...branchMappings, branchIdCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Select Column --</option>
                        {getBranchesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Node From (Start) <span className="text-red-500">*</span>:
                        </label>
                        <span className="text-[10px] text-amber-600 font-medium">Required</span>
                      </div>
                      <select
                        value={branchMappings.branchFromCol}
                        onChange={e => setBranchMappings({ ...branchMappings, branchFromCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Select Column --</option>
                        {getBranchesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Node To (End) <span className="text-red-500">*</span>:
                        </label>
                        <span className="text-[10px] text-amber-600 font-medium">Required</span>
                      </div>
                      <select
                        value={branchMappings.branchToCol}
                        onChange={e => setBranchMappings({ ...branchMappings, branchToCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Select Column --</option>
                        {getBranchesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Group 2: Physical Tray Geometry & Dimensions (4 columns) */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      Tray Dimensions &amp; Geometry
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Physical specifications for cross-section fill calculation</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Length (m) <span className="text-red-500">*</span>:
                        </label>
                        <span className="text-[10px] text-amber-600 font-medium">Required</span>
                      </div>
                      <select
                        value={branchMappings.branchLengthCol}
                        onChange={e => setBranchMappings({ ...branchMappings, branchLengthCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Select Column --</option>
                        {getBranchesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Elevation / Level:
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal">e.g. L1</span>
                      </div>
                      <select
                        value={branchMappings.branchLevelCol}
                        onChange={e => setBranchMappings({ ...branchMappings, branchLevelCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Default (Level 1) --</option>
                        {getBranchesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Side Height (mm):
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal">{defaultTrayHeight}mm</span>
                      </div>
                      <select
                        value={branchMappings.branchHeightCol}
                        onChange={e => setBranchMappings({ ...branchMappings, branchHeightCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Default ({defaultTrayHeight}mm) --</option>
                        {getBranchesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between h-5 text-xs">
                        <label className="font-semibold text-slate-700">
                          Orientation:
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal">H / V</span>
                      </div>
                      <select
                        value={branchMappings.branchTypeCol}
                        onChange={e => setBranchMappings({ ...branchMappings, branchTypeCol: e.target.value })}
                        className="w-full h-9 rounded-md border border-slate-300 px-2.5 py-1.5 bg-white text-xs text-slate-800 shadow-2xs hover:border-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="">-- Horizontal / Vertical --</option>
                        {getBranchesHeaders().map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Type Normalization (Only for Cables) */}
        {activeStep === 'types' && importScope !== 'branches_only' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Industrial Category Rules:</span>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><strong>Power:</strong> Single-layer spacing (2 &times; OD) to ensure heat dissipation.</li>
                <li><strong>Control / Signal:</strong> Multilayer area fill limited to {parameters?.control_fill_pct ?? 40}%.</li>
                <li><strong>Data / Bus:</strong> Compartmentalized or area calculation with barrier segregation.</li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2">Detected Raw Excel Type</th>
                    <th className="p-2">Calculation Target Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uniqueRawTypes.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-slate-400 italic">
                        No distinct types detected in column. Defaulting all cables to &apos;Power&apos; or &apos;Control&apos;.
                      </td>
                    </tr>
                  ) : (
                    uniqueRawTypes.map((rawType, idx) => (
                      <tr
                        key={rawType}
                        className={`${idx % 2 === 1 ? 'bg-slate-50/70 hover:bg-slate-100/70' : 'bg-white hover:bg-slate-50/70'}`}
                      >
                        <td className="p-2 font-medium text-slate-800">{rawType}</td>
                        <td className="p-2">
                          <select
                            value={typeCategoryMap[rawType] || 'power'}
                            onChange={e =>
                              setTypeCategoryMap({
                                ...typeCategoryMap,
                                [rawType]: e.target.value as CableCategory,
                              })
                            }
                            className="rounded border border-slate-300 p-1 bg-white text-xs"
                          >
                            <option value="power">Power (Single Layer 2x OD)</option>
                            <option value="control">Control / Signal (Multilayer Area)</option>
                            <option value="data">Data / Bus (Segregated Area)</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <DialogFooter className="flex items-center justify-between sm:justify-between pt-3">
          <div>
            {activeStep !== 'upload' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeStep === 'types') setActiveStep('mapping');
                  else if (activeStep === 'mapping') setActiveStep('sheets');
                  else if (activeStep === 'sheets') setActiveStep('upload');
                }}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>

            {activeStep === 'upload' && canProceedFromUpload() && (
              <Button size="sm" onClick={() => setActiveStep('sheets')}>
                Next: Inspect Sheets &amp; Previews <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {activeStep === 'sheets' && (
              <Button size="sm" onClick={proceedToMapping}>
                Next: Map Columns <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {activeStep === 'mapping' && (
              importScope === 'branches_only' ? (
                <Button size="sm" variant="default" onClick={handleApplyImport} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Finish &amp; Apply Branches
                </Button>
              ) : (
                <Button size="sm" onClick={proceedToTypeNormalization}>
                  Next: Normalize Types <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )
            )}

            {activeStep === 'types' && (
              <Button size="sm" variant="default" onClick={handleApplyImport} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Finish &amp; Apply Dataset
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
