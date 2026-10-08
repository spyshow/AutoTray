'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Cable, CableCategory, CalculationParameters } from '@/lib/types';
import { lookupCatalogCableOd } from '@/lib/cable-catalog';
import { guessCableCategory, normalizeCableSpec, stripCableSpecUnits } from '@/lib/excel';
import {
  AlertTriangle,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MissingSpecItem {
  spec: string;
  count: number;
  category: CableCategory;
  od_mm: number;
}

interface MissingSpecOdModalProps {
  isOpen: boolean;
  onClose: () => void;
  cables: Cable[];
  parameters: CalculationParameters;
  onSave: (newRules: Record<string, number>, updatedCables: Cable[]) => void;
  initialSpec?: string; // If opened specifically for one spec
}

export function MissingSpecOdModal({
  isOpen,
  onClose,
  cables,
  parameters,
  onSave,
  initialSpec,
}: MissingSpecOdModalProps) {
  const [specsData, setSpecsData] = useState<Record<string, { od: string; category: CableCategory }>>({});

  // 1. Identify all cable specifications that lack a rule or catalog entry
  const missingSpecs = useMemo(() => {
    const customRules = parameters?.custom_od_by_type || {};
    const specMap = new Map<string, { count: number; category: CableCategory; rawSpecs: Set<string> }>();

    cables.forEach(c => {
      const rawSpec = String(c.cable_type || '').trim();
      if (!rawSpec) return;

      const spec = normalizeCableSpec(rawSpec) || rawSpec;

      // Check if spec or rawSpec is defined in custom rules
      const hasCustomRule = Boolean(
        (customRules[spec] && customRules[spec] > 0) ||
        (customRules[rawSpec] && customRules[rawSpec] > 0)
      );
      // Check if catalog has it
      const catalogOd = lookupCatalogCableOd(spec) || lookupCatalogCableOd(rawSpec);
      const hasCatalogEntry = catalogOd !== null && catalogOd > 0;

      // If opened specifically for initialSpec or if neither rule nor catalog has it
      if (initialSpec ? (spec === initialSpec || rawSpec === initialSpec) : (!hasCustomRule && !hasCatalogEntry)) {
        const cat = c.category || guessCableCategory(spec);
        const existing = specMap.get(spec);
        if (existing) {
          existing.count += c.count || 1;
          existing.rawSpecs.add(rawSpec);
        } else {
          specMap.set(spec, { count: c.count || 1, category: cat, rawSpecs: new Set([rawSpec]) });
        }
      }
    });

    return Array.from(specMap.entries()).map(([spec, data]) => ({
      spec,
      count: data.count,
      category: data.category,
      rawSpecs: Array.from(data.rawSpecs),
    }));
  }, [cables, parameters, initialSpec]);

  // Suggested OD by category (Control cables leave empty so user enters verified OD)
  const getDefaultOdForCategory = (cat: CableCategory): string => {
    if (cat === 'power' && parameters?.default_power_od_mm) return String(parameters.default_power_od_mm);
    if (cat === 'signal' && parameters?.default_signal_od_mm) return String(parameters.default_signal_od_mm);
    if ((cat === 'data' || cat === 'bus') && parameters?.default_data_od_mm) return String(parameters.default_data_od_mm);
    return ''; // DO NOT use or suggest default control cable setting!
  };

  // Populate state when modal opens or missingSpecs changes
  useEffect(() => {
    if (!isOpen) return;

    const initial: Record<string, { od: string; category: CableCategory }> = {};
    missingSpecs.forEach(item => {
      // If cable already had an explicit OD in table, use that, else leave empty for user entry
      const matchingCable = cables.find(c => (c.cable_type === item.spec || item.rawSpecs.includes(c.cable_type || '')) && c.od_mm && c.od_mm > 0);
      const defOd = matchingCable?.od_mm ? String(matchingCable.od_mm) : getDefaultOdForCategory(item.category);
      initial[item.spec] = {
        od: defOd,
        category: item.category,
      };
    });

    setSpecsData(initial);
  }, [isOpen, missingSpecs, cables, parameters]);

  const handleOdChange = (spec: string, value: string) => {
    setSpecsData(prev => ({
      ...prev,
      [spec]: {
        ...prev[spec],
        od: value,
      },
    }));
  };

  const handleCategoryChange = (spec: string, newCat: CableCategory) => {
    setSpecsData(prev => ({
      ...prev,
      [spec]: {
        ...prev[spec],
        category: newCat,
      },
    }));
  };

  const handleSaveAndApply = () => {
    const nextCustomRules: Record<string, number> = { ...(parameters?.custom_od_by_type || {}) };
    const specToOdMap: Record<string, number> = {};

    Object.entries(specsData).forEach(([spec, data]) => {
      const parsed = parseFloat(data.od);
      if (!isNaN(parsed) && parsed > 0) {
        const cleanSpec = stripCableSpecUnits(spec) || spec;
        nextCustomRules[cleanSpec] = parsed;
        specToOdMap[cleanSpec] = parsed;
        specToOdMap[spec] = parsed;
      }
    });

    // Update all matching cables in project
    const updatedCables = cables.map(c => {
      const rawSpec = String(c.cable_type || '').trim();
      const spec = normalizeCableSpec(rawSpec) || rawSpec;
      const cleanSpec = stripCableSpecUnits(spec);
      if (specToOdMap[cleanSpec] !== undefined || specToOdMap[spec] !== undefined || specToOdMap[rawSpec] !== undefined) {
        const od = specToOdMap[cleanSpec] !== undefined ? specToOdMap[cleanSpec] : (specToOdMap[spec] !== undefined ? specToOdMap[spec] : specToOdMap[rawSpec]);
        const cat = specsData[cleanSpec]?.category || specsData[spec]?.category || specsData[rawSpec]?.category || c.category;
        return {
          ...c,
          cable_type: cleanSpec,
          od_mm: od,
          category: cat,
        };
      }
      // If cable can now be resolved from catalog, update its OD and normalize type
      const catOd = lookupCatalogCableOd(spec) || lookupCatalogCableOd(rawSpec);
      if (catOd !== null && catOd > 0 && (!c.od_mm || c.od_mm <= 0)) {
        return {
          ...c,
          cable_type: spec,
          od_mm: catOd,
        };
      }
      if (spec && spec !== rawSpec) {
        return {
          ...c,
          cable_type: spec,
        };
      }
      return c;
    });

    onSave(nextCustomRules, updatedCables);
    onClose();
  };

  if (missingSpecs.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sliders className="h-5 w-5 text-blue-600" />
            Enter Outer Diameter (OD) for New Cable Specifications
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            The following cable specifications are not yet in your project rules or the manufacturer handbook.
            Specify their Outer Diameter (OD in mm) to save them to your permanent project rules and calculate tray sizing accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{missingSpecs.length} specification{missingSpecs.length > 1 ? 's' : ''} detected</span> without standard catalog rules.
              Entering their outer diameter will apply to all matching cables across the schedule.
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Cable Specification</th>
                  <th className="py-2.5 px-2">Cables</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-3 text-right">Outer Diameter (OD mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {missingSpecs.map(item => {
                  const current = specsData[item.spec] || {
                    od: String(getDefaultOdForCategory(item.category)),
                    category: item.category,
                  };
                  return (
                    <tr key={item.spec} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.spec}</span>
                          {/(?:^|[^\d])\d+\s*(?:[xX*×Gg\/])\s*[\d\.]+/i.test(item.spec) && (
                            <span className="text-[10px] text-slate-400 font-sans font-normal">mm²</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="bg-slate-50 text-[11px] font-normal text-slate-600">
                          {item.count} cable{item.count > 1 ? 's' : ''}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={current.category}
                          onChange={e => handleCategoryChange(item.spec, e.target.value as CableCategory)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-700 capitalize"
                        >
                          <option value="power">Power</option>
                          <option value="control">Control</option>
                          <option value="signal">Signal</option>
                          <option value="data">Data</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Input
                            type="number"
                            step="0.1"
                            min="1.0"
                            value={current.od}
                            onChange={e => handleOdChange(item.spec, e.target.value)}
                            placeholder="e.g. 14.5"
                            className="h-8 w-24 text-right font-mono font-bold text-blue-700"
                          />
                          <span className="text-slate-400 font-medium text-[11px]">mm</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-200 flex items-center justify-between sm:justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-500">
            Close (Keep Unconfigured)
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAndApply}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Rules &amp; Apply to Cables
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
