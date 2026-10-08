'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CalculationParameters, Cable } from '@/lib/types';
import { STANDARD_COMMERCIAL_WIDTHS } from '@/lib/client-calculator';
import {
  LOW_VOLTAGE_CABLE_CATALOG,
  lookupCatalogCableOd,
  CatalogCableItem,
} from '@/lib/cable-catalog';
import { stripCableSpecUnits } from '@/lib/excel';
import { getStoredPageSize, setStoredPageSize } from '@/lib/page-size-storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Sliders,
  Zap,
  Cpu,
  Radio,
  Network,
  HelpCircle,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Info,
  Layers,
  BookOpen,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckSquare,
  Activity,
  Download,
  Folder,
  Settings,
} from 'lucide-react';

interface DefaultsSettingsTabProps {
  parameters: CalculationParameters;
  onChangeParameters: (params: CalculationParameters) => void;
  onApplyAndRecalculate: () => void;
  onLoadDemoData?: () => void;
  onDownloadSampleTemplate?: () => void;
  cables?: Cable[];
  onUpdateCables?: (cables: Cable[]) => void;
}

export const getCatalogItemKey = (item: CatalogCableItem): string => {
  return item.code || `${item.category}_${item.designation}_${item.od_mm}`;
};

export const getCleanRuleKey = (item: CatalogCableItem): string => {
  return stripCableSpecUnits(item.designation) || item.designation.trim();
};

export function DefaultsSettingsTab({
  parameters,
  onChangeParameters,
  onApplyAndRecalculate,
  onLoadDemoData,
  onDownloadSampleTemplate,
  cables,
  onUpdateCables,
}: DefaultsSettingsTabProps) {
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeOd, setNewTypeOd] = useState('');
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Catalog browser & editable state
  const [catalogItems, setCatalogItems] = useState<CatalogCableItem[]>(LOW_VOLTAGE_CABLE_CATALOG);
  const [selectedCatalogKeys, setSelectedCatalogKeys] = useState<Set<string>>(new Set());
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');
  const [catalogPage, setCatalogPage] = useState(1);
  const [testInput, setTestInput] = useState('4x50');
  const [addedRuleToast, setAddedRuleToast] = useState<string | null>(null);

  // Measure sticky header and catalog toolbar offsets dynamically
  const catalogToolbarRef = useRef<HTMLDivElement>(null);
  const [headerOffset, setHeaderOffset] = useState(57);
  const [catalogToolbarHeight, setCatalogToolbarHeight] = useState(56);

  useEffect(() => {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;
    const updateOffset = () => {
      setHeaderOffset(headerEl.offsetHeight);
    };
    updateOffset();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateOffset);
      ro.observe(headerEl);
      return () => ro.disconnect();
    }
  }, []);

  useEffect(() => {
    if (!catalogToolbarRef.current) return;
    const updateToolbar = () => {
      if (catalogToolbarRef.current) {
        setCatalogToolbarHeight(catalogToolbarRef.current.offsetHeight);
      }
    };
    updateToolbar();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateToolbar);
      ro.observe(catalogToolbarRef.current);
      return () => ro.disconnect();
    }
  }, []);

  const customRules = parameters.custom_od_by_type || {};

  const syncCablesWithRule = (ruleKey: string, newOd: number) => {
    if (!cables || !onUpdateCables || cables.length === 0) return;
    const cleanRule = stripCableSpecUnits(ruleKey).toLowerCase();
    let hasChanges = false;
    const updated = cables.map(c => {
      const cType = String(c.cable_type || '').trim().toLowerCase();
      const cleanType = stripCableSpecUnits(cType);
      if (cleanType === cleanRule || cType === cleanRule) {
        if (c.od_mm !== newOd) {
          hasChanges = true;
          return { ...c, od_mm: newOd };
        }
      }
      return c;
    });
    if (hasChanges) {
      onUpdateCables(updated);
    }
  };

  const handleAddCustomRule = () => {
    const rawName = newTypeName.trim();
    const cleanName = stripCableSpecUnits(rawName) || rawName;
    const parsedOd = parseFloat(newTypeOd);
    if (!cleanName || isNaN(parsedOd) || parsedOd <= 0) return;

    const nextCustom = { ...customRules, [cleanName]: parsedOd };
    onChangeParameters({
      ...parameters,
      custom_od_by_type: nextCustom,
    });
    syncCablesWithRule(cleanName, parsedOd);
    setNewTypeName('');
    setNewTypeOd('');
    setAddedRuleToast(`Added rule "${cleanName}" (${parsedOd} mm) & updated matching cables`);
    setTimeout(() => setAddedRuleToast(null), 2500);
  };

  const handleAddCatalogToRules = (item: CatalogCableItem) => {
    const cleanKey = getCleanRuleKey(item);
    const nextCustom = { ...customRules, [cleanKey]: item.od_mm };
    onChangeParameters({
      ...parameters,
      custom_od_by_type: nextCustom,
    });
    syncCablesWithRule(cleanKey, item.od_mm);
    setAddedRuleToast(`Added "${cleanKey}" (${item.od_mm} mm) to Custom Rules`);
    setTimeout(() => setAddedRuleToast(null), 2500);
  };

  const handleAddSelectedToRules = () => {
    const selectedItems = catalogItems.filter(item => selectedCatalogKeys.has(getCatalogItemKey(item)));
    if (selectedItems.length === 0) return;

    const nextCustom = { ...customRules };
    selectedItems.forEach(item => {
      const cleanKey = getCleanRuleKey(item);
      nextCustom[cleanKey] = item.od_mm;
      syncCablesWithRule(cleanKey, item.od_mm);
    });

    onChangeParameters({
      ...parameters,
      custom_od_by_type: nextCustom,
    });

    const count = selectedItems.length;
    setAddedRuleToast(`Added ${count} cable${count > 1 ? 's' : ''} to Custom Rules & updated cables!`);
    setTimeout(() => setAddedRuleToast(null), 3000);
    setSelectedCatalogKeys(new Set());
  };

  const handleDeleteSelectedFromCatalog = () => {
    const count = selectedCatalogKeys.size;
    if (count === 0) return;

    setCatalogItems(prev => prev.filter(item => !selectedCatalogKeys.has(getCatalogItemKey(item))));
    setSelectedCatalogKeys(new Set());
    setAddedRuleToast(`Removed ${count} cable${count > 1 ? 's' : ''} from catalog view`);
    setTimeout(() => setAddedRuleToast(null), 3000);
  };

  const handleDeleteCatalogItem = (itemKey: string) => {
    setCatalogItems(prev => prev.filter(item => getCatalogItemKey(item) !== itemKey));
    setSelectedCatalogKeys(prev => {
      const next = new Set(prev);
      next.delete(itemKey);
      return next;
    });
  };

  const handleResetCatalog = () => {
    setCatalogItems(LOW_VOLTAGE_CABLE_CATALOG);
    setSelectedCatalogKeys(new Set());
    setAddedRuleToast(`Catalog restored to original ${LOW_VOLTAGE_CABLE_CATALOG.length} handbook entries`);
    setTimeout(() => setAddedRuleToast(null), 3000);
  };

  const handleDeleteCustomRule = (typeName: string) => {
    const nextCustom = { ...customRules };
    delete nextCustom[typeName];
    onChangeParameters({
      ...parameters,
      custom_od_by_type: nextCustom,
    });
  };

  const handleClearAllCustomRules = () => {
    onChangeParameters({
      ...parameters,
      custom_od_by_type: {},
    });
    setAddedRuleToast('All custom type rules cleared');
    setTimeout(() => setAddedRuleToast(null), 2500);
  };

  const handleResetToStandard = () => {
    onChangeParameters({
      ...parameters,
      default_power_od_mm: 25.0,
      default_control_od_mm: 14.0,
      default_signal_od_mm: 10.0,
      default_data_od_mm: 8.5,
      default_global_od_mm: 15.0,
      custom_od_by_type: {
        '400V Feeder': 28.0,
        'PROFINET': 7.5,
        'Cat6 Ethernet': 6.5,
      },
      single_core_power_formation: 'trefoil',
      control_cable_laying_method: 'multi_layer',
    });
  };

  const triggerSaveAndRecalc = () => {
    onApplyAndRecalculate();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // Dynamic category counts from active catalog items
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: catalogItems.length };
    catalogItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [catalogItems]);

  // Filter catalog items
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter(item => {
      // Category filter
      if (catalogCategory !== 'ALL' && item.category !== catalogCategory) {
        return false;
      }
      // Search filter
      if (catalogSearch.trim()) {
        const query = catalogSearch.toLowerCase().trim();
        const matchDesignation = item.designation.toLowerCase().includes(query);
        const matchCode = item.code?.toLowerCase().includes(query) ?? false;
        const matchSize = item.size_mm2.toString().includes(query);
        const matchCores = item.cores.toString() === query;
        if (!matchDesignation && !matchCode && !matchSize && !matchCores) {
          return false;
        }
      }
      return true;
    });
  }, [catalogItems, catalogCategory, catalogSearch]);

  const [pageSize, setPageSize] = useState(10);

  // Restore saved page size preference from localStorage
  useEffect(() => {
    const saved = getStoredPageSize('catalog');
    if (saved && saved !== pageSize) {
      setPageSize(saved);
    }
  }, []);

  const totalPages = Math.ceil(filteredCatalog.length / pageSize) || 1;
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * pageSize;
    return filteredCatalog.slice(start, start + pageSize);
  }, [filteredCatalog, catalogPage]);

  // Guard against out-of-range page when items are removed
  useEffect(() => {
    if (catalogPage > totalPages) {
      setCatalogPage(totalPages);
    }
  }, [catalogPage, totalPages]);

  // Selection states
  const allFilteredSelected = useMemo(() => {
    if (filteredCatalog.length === 0) return false;
    return filteredCatalog.every(item => selectedCatalogKeys.has(getCatalogItemKey(item)));
  }, [filteredCatalog, selectedCatalogKeys]);

  const someFilteredSelected = useMemo(() => {
    if (allFilteredSelected || filteredCatalog.length === 0) return false;
    return filteredCatalog.some(item => selectedCatalogKeys.has(getCatalogItemKey(item)));
  }, [allFilteredSelected, filteredCatalog, selectedCatalogKeys]);

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedCatalogKeys(prev => {
      const next = new Set(prev);
      if (checked) {
        filteredCatalog.forEach(item => next.add(getCatalogItemKey(item)));
      } else {
        filteredCatalog.forEach(item => next.delete(getCatalogItemKey(item)));
      }
      return next;
    });
  };

  const handleToggleItem = (key: string, checked: boolean) => {
    setSelectedCatalogKeys(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  // Test lookup resolution against active in-memory catalog
  const testResolvedOd = useMemo(() => {
    return lookupCatalogCableOd(testInput, catalogItems);
  }, [testInput, catalogItems]);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm border border-blue-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold">Project Settings &amp; Sizing Parameters Engine</h2>
            </div>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              Configure global sizing parameters (spare design margins, tray side heights, control fill factors, metallic divider), sample project tools, and technical cable diameter rules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToStandard}
              className="bg-blue-950/60 border-blue-700 text-blue-200 hover:bg-blue-800 hover:text-white text-xs h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Standards
            </Button>
            <Button
              size="sm"
              onClick={triggerSaveAndRecalc}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-sm"
            >
              {saveFeedback ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-white" />
                  Applied!
                </>
              ) : (
                'Save & Recalculate'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Top Grid: Sizing & Calculation Parameters (Photo 2) & Project Tools (Photo 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sizing & Calculation Parameters Card (Photo 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              Sizing &amp; Calculation Parameters
            </h3>
            <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
              NEC 392 / IEC 60364
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Spare Margin Slider */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-600" />
                  Spare Design Margin:
                </span>
                <span className="font-mono text-blue-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {parameters.spare_margin_pct}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Additional reserve width factor added to accommodate future cable expansion.
              </p>
              <Slider
                min={0}
                max={60}
                step={5}
                value={[parameters.spare_margin_pct]}
                onValueChange={([val]) =>
                  onChangeParameters({ ...parameters, spare_margin_pct: val })
                }
                className="py-1"
              />
            </div>

            {/* Max Control Fill Factor Slider */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-indigo-600" />
                  Control Fill Limit (NEC 392):
                </span>
                <span className="font-mono text-indigo-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {parameters.control_fill_pct}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Maximum cross-sectional fill ratio for multilayer packed control cables (standard: 40%).
              </p>
              <Slider
                min={20}
                max={70}
                step={5}
                value={[parameters.control_fill_pct]}
                onValueChange={([val]) =>
                  onChangeParameters({ ...parameters, control_fill_pct: val })
                }
                className="py-1"
              />
            </div>

            {/* Standard Tray Height Selector */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="font-semibold text-xs text-slate-700 block">
                Default Tray Side Height:
              </span>
              <p className="text-[11px] text-slate-500">
                Standard side flange height used when branches do not specify custom height.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {[50, 60, 75, 100].map(h => (
                  <button
                    key={h}
                    onClick={() =>
                      onChangeParameters({ ...parameters, default_tray_height_mm: h })
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition cursor-pointer ${
                      parameters.default_tray_height_mm === h
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {h} mm
                  </button>
                ))}
              </div>
            </div>

            {/* Structural Safety Margin */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-600" />
                  Structural Safety Margin:
                </span>
                <span className="font-mono text-blue-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {parameters.structural_safety_margin_pct ?? 15}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Extra loading safety allowance above rated routed cable weight (IEC 61537 / NEMA VE 1).
              </p>
              <Slider
                min={0}
                max={40}
                step={5}
                value={[parameters.structural_safety_margin_pct ?? 15]}
                onValueChange={([val]) =>
                  onChangeParameters({ ...parameters, structural_safety_margin_pct: val })
                }
                className="py-1"
              />
            </div>

            {/* Tray Sheet Steel Thickness & Default Mounting */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-700 block">
                  Sheet Metal Thickness:
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {parameters.tray_sheet_thickness_mm ?? 1.5} mm
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                {[1.0, 1.2, 1.5, 2.0].map(thk => (
                  <button
                    key={thk}
                    onClick={() =>
                      onChangeParameters({ ...parameters, tray_sheet_thickness_mm: thk })
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition cursor-pointer ${
                      (parameters.tray_sheet_thickness_mm ?? 1.5) === thk
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {thk} mm
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">Default Support:</span>
                <button
                  onClick={() =>
                    onChangeParameters({
                      ...parameters,
                      default_mounting_type:
                        (parameters.default_mounting_type ?? 'ceiling_trapeze') === 'ceiling_trapeze'
                          ? 'wall_cantilever'
                          : 'ceiling_trapeze',
                    })
                  }
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                >
                  {(parameters.default_mounting_type ?? 'ceiling_trapeze') === 'ceiling_trapeze'
                    ? 'Ceiling Trapeze'
                    : 'Wall Cantilever'}
                </button>
              </div>
            </div>

            {/* Metallic Divider Toggle */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block text-xs">
                    Metallic Barrier / Divider
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Segregate Power &amp; Control ({parameters.divider_width_mm} mm width)
                  </span>
                </div>
                <button
                  onClick={() =>
                    onChangeParameters({
                      ...parameters,
                      add_metallic_divider: !parameters.add_metallic_divider,
                    })
                  }
                  className={`h-5 w-9 rounded-full transition-colors p-0.5 cursor-pointer ${
                    parameters.add_metallic_divider ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  title="Toggle internal tray divider"
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      parameters.add_metallic_divider ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                When enabled, inserts an internal partition dividing the tray into isolated power and control channels.
              </p>
            </div>
          </div>
        </div>

        {/* Project Tools & Sample Data Card (Photo 1) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Folder className="h-4 w-4 text-indigo-600" />
              Project Tools &amp; Actions
            </h3>
            <Badge variant="outline" className="text-[10px] text-slate-500">
              Utilities
            </Badge>
          </div>

          <div className="space-y-3">
            {onLoadDemoData && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Plant Demo Dataset</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoadDemoData}
                    className="h-7 text-xs text-slate-700 hover:bg-slate-100 border-slate-300 gap-1.5"
                  >
                    <RotateCcw className="h-3 w-3 text-slate-500" />
                    Load Plant Demo
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Load full 3-level industrial plant demo with pre-configured MCCs, risers, and field cables.
                </p>
              </div>
            )}

            {onDownloadSampleTemplate && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Excel Sample Template</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownloadSampleTemplate}
                    className="h-7 text-xs text-slate-700 hover:bg-slate-100 border-slate-300 gap-1.5"
                  >
                    <Download className="h-3 w-3 text-slate-500" />
                    Sample Template
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Download a pre-formatted Excel workbook (.xlsx) with Cables and Branches sheets for your schedule.
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">Factory Standards</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToStandard}
                  className="h-7 text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Defaults
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Restore all parameters, default cable ODs, and sizing rules back to standard recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Hierarchy Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
        <div className="flex items-center gap-2 text-slate-800 font-bold mb-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span>Automatic Cable OD Resolution Sequence</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
          <div className="p-2 bg-white rounded border border-slate-200 shadow-2xs">
            <span className="font-bold text-slate-700 block">1. Schedule OD</span>
            <span className="text-slate-500">Explicit OD column from Excel or manual entry</span>
          </div>
          <div className="p-2 bg-white rounded border border-indigo-200 shadow-2xs bg-indigo-50/20">
            <span className="font-bold text-indigo-700 block">2. Custom Rules</span>
            <span className="text-slate-500">Project-specific designation overrides</span>
          </div>
          <div className="p-2 bg-white rounded border border-emerald-300 shadow-2xs bg-emerald-50/30">
            <span className="font-bold text-emerald-700 block">3. Catalog Auto-Match</span>
            <span className="text-slate-500">Manufacturer handbook (e.g. 4x50, 4x1.5, 12x1.5)</span>
          </div>
          <div className="p-2 bg-white rounded border border-slate-200 shadow-2xs">
            <span className="font-bold text-slate-700 block">4. Category Default</span>
            <span className="text-slate-500">Power, Signal, or Data defaults</span>
          </div>
          <div className="p-2 bg-white rounded border border-blue-200 shadow-2xs bg-blue-50/30">
            <span className="font-bold text-blue-700 block">5. Missing Spec Modal</span>
            <span className="text-slate-500">Prompts for exact OD on uncatalogued control cables</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Standard Category Defaults & Custom Rules */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                Category Default Outer Diameters (OD in mm)
              </h3>
              <Badge variant="outline" className="text-[10px] text-slate-500">
                Fallback Priority 4
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Power Cables */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Power Cables
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                    Single Layer (2x OD)
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Applied to 400V, HV, MV, motor feeders, and general power circuits.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={parameters.default_power_od_mm ?? 25.0}
                    onChange={e =>
                      onChangeParameters({
                        ...parameters,
                        default_power_od_mm: parseFloat(e.target.value) || 25.0,
                      })
                    }
                    className="w-24 rounded border border-slate-300 p-1.5 text-xs font-mono font-bold bg-white text-right"
                  />
                  <span className="text-xs font-semibold text-slate-600">mm</span>
                </div>
              </div>

              {/* Control Cables */}
              <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Cpu className="h-3.5 w-3.5 text-blue-600" />
                    Control Cables
                  </span>
                  <Badge className="bg-blue-600 text-white border-blue-700 text-[10px]">
                    Catalog / Modal Required
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 mb-2">
                  Multilayer packing by cross-sectional area (NEC 392). Generic 14 mm default fallback is disabled.
                </p>
                <div className="text-[11px] bg-white p-2 rounded border border-blue-200 text-blue-900 font-medium">
                  Uncatalogued control cables without explicit schedule OD will trigger the <strong>Missing Spec OD Modal</strong> to enter exact OD.
                </div>
              </div>

              {/* Signal / Instrumentation */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Radio className="h-3.5 w-3.5 text-emerald-500" />
                    Signal / Instrumentation
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                    Multilayer Area
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Applied to 4-20mA transmitters, thermocouples, RTDs, and sensors.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={parameters.default_signal_od_mm ?? 10.0}
                    onChange={e =>
                      onChangeParameters({
                        ...parameters,
                        default_signal_od_mm: parseFloat(e.target.value) || 10.0,
                      })
                    }
                    className="w-24 rounded border border-slate-300 p-1.5 text-xs font-mono font-bold bg-white text-right"
                  />
                  <span className="text-xs font-semibold text-slate-600">mm</span>
                </div>
              </div>

              {/* Data / Communication */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Network className="h-3.5 w-3.5 text-purple-500" />
                    Data / Fieldbus
                  </span>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                    Segregated / Area
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Applied to Ethernet, Profinet, Modbus, DeviceNet, and fiber optic lines.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={parameters.default_data_od_mm ?? 8.5}
                    onChange={e =>
                      onChangeParameters({
                        ...parameters,
                        default_data_od_mm: parseFloat(e.target.value) || 8.5,
                      })
                    }
                    className="w-24 rounded border border-slate-300 p-1.5 text-xs font-mono font-bold bg-white text-right"
                  />
                  <span className="text-xs font-semibold text-slate-600">mm</span>
                </div>
              </div>

              {/* Global Default Fallback */}
              <div className="sm:col-span-2 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                    Global Fallback Diameter (Unrecognized Cable Category)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Used when a cable type does not match any catalog entry, custom rule, or category pattern.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={parameters.default_global_od_mm ?? 15.0}
                    onChange={e =>
                      onChangeParameters({
                        ...parameters,
                        default_global_od_mm: parseFloat(e.target.value) || 15.0,
                      })
                    }
                    className="w-24 rounded border border-slate-300 p-1.5 text-xs font-mono font-bold bg-white text-right"
                  />
                  <span className="text-xs font-semibold text-slate-600">mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Specific Type Rules */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Custom Cable Type Outer Diameter Rules
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign exact diameters to specific project designations (e.g. &apos;400V Feeder&apos;, &apos;PROFINET&apos;). Matches take highest priority.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {Object.keys(customRules).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllCustomRules}
                    className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 h-7 px-2"
                    title="Clear all custom rules"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clear All ({Object.keys(customRules).length})
                  </Button>
                )}
                <Badge variant="outline" className="text-[10px] text-indigo-700 bg-indigo-50 border-indigo-200">
                  Priority 2
                </Badge>
              </div>
            </div>

            {/* Existing custom rules list */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Specific Cable Type / Substring</th>
                    <th className="p-2.5">Assigned Default OD</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(customRules).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                        No custom type rules added. Catalog lookups and category defaults will be used.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(customRules).map(([tName, tOd]) => (
                      <tr key={tName} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{tName}</span>
                            {/(?:^|[^\d])\d+\s*(?:[xX*×Gg\/])\s*[\d\.]+/i.test(tName) && (
                              <span className="text-[10px] text-slate-400 font-sans font-normal">mm²</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-blue-700 font-bold">{tOd} mm</td>
                        <td className="p-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomRule(tName)}
                            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                            title="Delete rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add new rule form */}
            <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Type name (e.g. 10kV MV, Cat6A, 4x50)"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white pr-9"
                />
                {/(?:^|[^\d])\d+\s*(?:[xX*×Gg\/])\s*[\d\.]+/i.test(newTypeName) && (
                  <span className="absolute right-2 top-1.5 text-[11px] font-semibold text-slate-400 pointer-events-none select-none">
                    mm²
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  placeholder="OD (mm)"
                  value={newTypeOd}
                  onChange={e => setNewTypeOd(e.target.value)}
                  className="w-24 rounded border border-slate-300 p-1.5 text-xs bg-white text-right font-mono"
                />
                <span className="text-xs text-slate-500 font-medium">mm</span>
              </div>
              <Button
                size="sm"
                onClick={handleAddCustomRule}
                disabled={!newTypeName.trim() || !newTypeOd || parseFloat(newTypeOd) <= 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 whitespace-nowrap w-full sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Type Rule
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Industrial Tray Sizing Standard Reference */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Info className="h-4 w-4 text-blue-600" />
              Standard Commercial Widths
            </h3>

            <div className="mb-4">
              <p className="text-xs text-slate-600 mb-2">
                Active commercial standard sizes:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_COMMERCIAL_WIDTHS.map(w => (
                  <Badge
                    key={w}
                    variant="outline"
                    className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-50 text-slate-800 border-slate-300"
                  >
                    {w} mm
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Range: <strong>50 ➔ 700 mm</strong>. Calculated widths exceeding 700 mm automatically trigger the <code className="text-red-600 font-bold">OVERFILL_SPLIT_TIER</code> status flag.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="font-semibold text-slate-800 border-b border-slate-200 pb-1">
                Engineering Sizing Formulas:
              </div>
              <div>
                <strong className="text-slate-700">Power:</strong> Single-layer spacing with 2 &times; OD.
              </div>
              <div>
                <strong className="text-slate-700">Control / Signal:</strong>{' '}
                {parameters.control_cable_laying_method === 'single_layer'
                  ? 'Single layer flat (touching, width = OD).'
                  : `Multilayer area fill \u2264 ${parameters.control_fill_pct}%.`}
              </div>
              <div>
                <strong className="text-slate-700">Spare Margin:</strong> +{parameters.spare_margin_pct}% required width.
              </div>
              <div>
                <strong className="text-slate-700">Barrier:</strong> {parameters.add_metallic_divider ? `Enabled (${parameters.divider_width_mm} mm)` : 'Disabled'}.
              </div>
            </div>
          </div>

          {/* 1-Core Power Installation Method */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Zap className="h-4 w-4 text-amber-500" />
              1-Core Power Installation Method
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Default formation applied when sizing single-conductor (1-core) AC power cables (IEC 60364-5-52):
            </p>

            <div className="space-y-2">
              {/* Trefoil */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                (parameters.single_core_power_formation || 'trefoil') === 'trefoil'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-950 ring-1 ring-blue-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="single_core_power_formation"
                  value="trefoil"
                  checked={(parameters.single_core_power_formation || 'trefoil') === 'trefoil'}
                  onChange={() => onChangeParameters({ ...parameters, single_core_power_formation: 'trefoil' })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-slate-900">
                    Trefoil Formation (&quot;Trifoly&quot; &Delta;)
                    <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-800 border-blue-200 font-semibold">Recommended</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    3 single-core cables clamped in triangle. Floor width = <strong>2 &times; OD</strong> per 3 cables. Saves 33% tray width; bundle height &approx; 1.87 &times; OD.
                  </p>
                </div>
              </label>

              {/* Flat Touching */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                parameters.single_core_power_formation === 'flat_touching'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-950 ring-1 ring-blue-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="single_core_power_formation"
                  value="flat_touching"
                  checked={parameters.single_core_power_formation === 'flat_touching'}
                  onChange={() => onChangeParameters({ ...parameters, single_core_power_formation: 'flat_touching' })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Flat Touching (&quot;Near each other&quot;)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cables laid side-by-side touching on tray floor. Floor width = <strong>1.0 &times; OD</strong> per cable (3 &times; OD for 3-phase).
                  </p>
                </div>
              </label>

              {/* Flat Spaced */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                parameters.single_core_power_formation === 'flat_spaced'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-950 ring-1 ring-blue-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="single_core_power_formation"
                  value="flat_spaced"
                  checked={parameters.single_core_power_formation === 'flat_spaced'}
                  onChange={() => onChangeParameters({ ...parameters, single_core_power_formation: 'flat_spaced' })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Flat Spaced (1&times;OD Air Clearance)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cables laid flat with 1 &times; OD clearance between them. Floor width = <strong>2.0 &times; OD</strong> per cable.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Control & Signal Installation Method */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Control &amp; Signal Laying Method
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Standard layout method applied when sizing multi-conductor control, instrumentation, and data cables:
            </p>

            <div className="space-y-2">
              {/* Multi-layer Stacked */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                (parameters.control_cable_laying_method || 'multi_layer') === 'multi_layer'
                  ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="control_cable_laying_method"
                  value="multi_layer"
                  checked={(parameters.control_cable_laying_method || 'multi_layer') === 'multi_layer'}
                  onChange={() => onChangeParameters({ ...parameters, control_cable_laying_method: 'multi_layer' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-slate-900">
                    Multi-layer Stacked (Area Fill Method)
                    <Badge variant="outline" className="text-[10px] bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold">Standard</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cables are stacked across the tray depth up to the allowed fill limit ({parameters.control_fill_pct}%). Floor width contribution = <strong>Area / (Tray Height &times; Fill%)</strong> &times; Spare.
                  </p>
                </div>
              </label>

              {/* Single Layer Flat */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                parameters.control_cable_laying_method === 'single_layer'
                  ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="control_cable_laying_method"
                  value="single_layer"
                  checked={parameters.control_cable_laying_method === 'single_layer'}
                  onChange={() => onChangeParameters({ ...parameters, control_cable_laying_method: 'single_layer' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-slate-900">
                    Single Layer Flat (Touching)
                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-800 border-slate-300 font-semibold">Full OD</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cables laid side-by-side touching on tray floor (no stacking). Floor width contribution = <strong>Overall Diameter (OD)</strong> &times; Spare.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Auto-Matcher Tester */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              Catalog Auto-Detection Tester
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Type any cable designation below to test how the engine parses it from the manufacturer handbook:
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 4x50, 4x240, 3x16, 2x2.5, 1x240"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  className="flex-1 rounded border border-slate-300 p-1.5 text-xs bg-white font-mono"
                />
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                {testResolvedOd !== null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Catalog OD:</span>
                    <Badge className="bg-emerald-600 text-white font-mono text-xs">
                      {testResolvedOd} mm
                    </Badge>
                  </div>
                ) : (
                  <span className="text-amber-700 italic text-[11px]">
                    No catalog match for &quot;{testInput}&quot;. Falls back to category/global default.
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {['4x50', '4x240', '3x16', '2x2.5', '5x70', '1x240'].map(sample => (
                  <button
                    key={sample}
                    onClick={() => setTestInput(sample)}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULL TECHNICAL HANDBOOK CATALOG SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Manufacturer Technical Handbook: Low Voltage Cable Catalog (Pages 1–5)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Standards: IEC 60227 &amp; BS 6004 (450/750 V) | IEC 60502 (0.6/1 kV Cu/PVC/PVC). Outer diameters automatically resolve for any matching cable schedule entry.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {addedRuleToast && (
              <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 flex items-center gap-1.5 animate-in fade-in">
                <Check className="h-3.5 w-3.5" /> {addedRuleToast}
              </Badge>
            )}
            {catalogItems.length < LOW_VOLTAGE_CABLE_CATALOG.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetCatalog}
                className="h-8 text-xs border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5 shadow-2xs"
                title="Restore all removed handbook cables"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Catalog ({LOW_VOLTAGE_CABLE_CATALOG.length - catalogItems.length} hidden)
              </Button>
            )}
          </div>
        </div>

        {/* Sticky Filter Pills & Search Bar Toolbar */}
        <div
          ref={catalogToolbarRef}
          style={{ top: `${headerOffset}px` }}
          className="sticky z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-3 sm:px-5 shadow-xs space-y-3 transition-[top] duration-75"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL', label: 'All Cables', count: categoryCounts['ALL'] ?? catalogItems.length },
                { id: '1C_450_750V_BUILDING', label: '1C 450/750V Solid/Strand', count: categoryCounts['1C_450_750V_BUILDING'] ?? 0 },
                { id: '1C_450_750V_FLEX', label: '1C 450/750V Flex', count: categoryCounts['1C_450_750V_FLEX'] ?? 0 },
                { id: '1C_06_1KV_FLEX', label: '1C 0.6/1kV Flex', count: categoryCounts['1C_06_1KV_FLEX'] ?? 0 },
                { id: '2C_06_1KV', label: '2-Core 0.6/1kV', count: categoryCounts['2C_06_1KV'] ?? 0 },
                { id: '3C_06_1KV', label: '3-Core 0.6/1kV', count: categoryCounts['3C_06_1KV'] ?? 0 },
                { id: '4C_06_1KV', label: '4-Core 0.6/1kV', count: categoryCounts['4C_06_1KV'] ?? 0 },
                { id: '5C_06_1KV', label: '5-Core 0.6/1kV', count: categoryCounts['5C_06_1KV'] ?? 0 },
              ].map(cat => (
                <Button
                  key={cat.id}
                  variant={catalogCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setCatalogCategory(cat.id);
                    setCatalogPage(1);
                  }}
                  className={`text-xs h-7 px-2.5 ${
                    catalogCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 border-slate-200'
                  }`}
                >
                  {cat.label}
                  <span className="ml-1 opacity-70 text-[10px]">({cat.count})</span>
                </Button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search designation or size (e.g. 50, 4x, CP1)..."
                value={catalogSearch}
                onChange={e => {
                  setCatalogSearch(e.target.value);
                  setCatalogPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Dynamic Multi-Action Bar when items are selected */}
          {selectedCatalogKeys.size > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white font-semibold text-xs px-2.5 py-0.5">
                  {selectedCatalogKeys.size} selected
                </Badge>
                <span className="text-xs text-blue-900 font-medium">
                  Apply one-click batch actions across selected handbook cables:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleAddSelectedToRules}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 shadow-xs flex items-center gap-1.5"
                  title="Batch add all selected cables to Custom Type Rules"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Selected to Custom Rules ({selectedCatalogKeys.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelectedFromCatalog}
                  className="h-8 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 text-xs font-semibold px-3 flex items-center gap-1.5"
                  title="Remove selected cables from catalog view"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected from Catalog ({selectedCatalogKeys.size})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCatalogKeys(new Set())}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900 px-2.5"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Table of Catalog Cables */}
        <div className="overflow-x-auto md:overflow-visible">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 w-10 text-center shadow-xs transition-[top] duration-75"
                >
                  <input
                    ref={masterCheckboxRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={e => handleToggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select / deselect all filtered cables"
                  />
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 shadow-xs transition-[top] duration-75"
                >
                  Designation
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 shadow-xs transition-[top] duration-75"
                >
                  Catalog Code
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 shadow-xs transition-[top] duration-75"
                >
                  Voltage &amp; Standard
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 shadow-xs transition-[top] duration-75"
                >
                  Conductor &amp; Sheath
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 text-center shadow-xs transition-[top] duration-75"
                >
                  Cores &times; Size
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-blue-50/90 border-b border-slate-200 p-2.5 text-center font-bold text-blue-900 shadow-xs transition-[top] duration-75"
                >
                  OD (mm)
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 text-right shadow-xs transition-[top] duration-75"
                >
                  Weight (kg/km)
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 text-right shadow-xs transition-[top] duration-75"
                >
                  Current in Air (A)
                </th>
                <th
                  style={{ top: `${headerOffset + catalogToolbarHeight}px` }}
                  className="sticky z-10 bg-slate-100 border-b border-slate-200 p-2.5 text-right shadow-xs transition-[top] duration-75"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCatalog.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                    No cable catalog entries match your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedCatalog.map(item => {
                  const itemKey = getCatalogItemKey(item);
                  const isSelected = selectedCatalogKeys.has(itemKey);
                  const cleanKey = getCleanRuleKey(item);
                  const isAlreadyRule = Boolean(customRules[cleanKey]);

                  return (
                    <tr
                      key={itemKey}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/80 hover:bg-blue-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-2.5 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => handleToggleItem(itemKey, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.designation}</span>
                          {isAlreadyRule && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                              title="Active in Custom Rules"
                            >
                              Rule Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                        {item.code || '-'}
                      </td>
                      <td className="p-2.5">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                          {item.voltage}
                        </span>
                        <span className="text-slate-400 ml-1 text-[10px]">{item.standard}</span>
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {item.conductorType} {item.insulationSheath}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        {item.cores} &times; {item.size_mm2} mm²
                      </td>
                      <td className="p-2.5 text-center bg-blue-50/40">
                        <Badge className="bg-blue-600 text-white font-mono text-xs font-bold px-2 py-0.5">
                          {item.od_mm} mm
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {item.weight_kg_km ? item.weight_kg_km.toLocaleString() : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {item.currentAir_A ? `${item.currentAir_A} A` : '-'}
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddCatalogToRules(item)}
                            className="h-6 px-2 text-[11px] text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                            title="Add this designation as an explicit custom rule with one click"
                          >
                            <Plus className="h-3 w-3 mr-0.5" /> Rule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCatalogItem(itemKey)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete this cable from catalog view"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 sm:px-5 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 rounded-b-xl">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {filteredCatalog.length === 0 ? 0 : (catalogPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(catalogPage * pageSize, filteredCatalog.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{filteredCatalog.length}</span> cables
            {selectedCatalogKeys.size > 0 && (
              <span className="ml-2 text-blue-700 font-semibold">
                ({selectedCatalogKeys.size} selected)
              </span>
            )}
            <div className="inline-flex items-center gap-1.5 border-l border-slate-200 pl-3 ml-3">
              <span>Lines per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  const newSize = Number(e.target.value);
                  setStoredPageSize(newSize, 'catalog');
                  setPageSize(newSize);
                  setCatalogPage(1);
                }}
                className="h-6 px-1.5 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={catalogPage <= 1}
              onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs font-medium text-slate-600">
              Page {catalogPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={catalogPage >= totalPages}
              onClick={() => setCatalogPage(p => Math.min(totalPages, p + 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
