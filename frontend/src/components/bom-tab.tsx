'use client';

import React from 'react';
import { BillOfMaterials, CalculationParameters } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Ruler,
  Wrench,
  Cable as CableIcon,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Package,
} from 'lucide-react';

interface BomTabProps {
  bom: BillOfMaterials | null | undefined;
  parameters: CalculationParameters;
  onExportExcel: () => void;
  isExporting: boolean;
}

export function BomTab({ bom, parameters, onExportExcel, isExporting }: BomTabProps) {
  if (!bom || (bom.trays.length === 0 && bom.cables_summary.length === 0)) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center my-6">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">No Bill of Materials Generated</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Add branches and cables, then run calculation to automatically generate the commercial tray sections, installation hardware, and cable length schedule.
        </p>
      </div>
    );
  }

  const totalAccessoriesCount = bom.accessories.reduce((sum, a) => sum + a.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold">Bill of Materials (BOM) & Material Take-Off</h2>
            <Badge variant="outline" className="bg-blue-950/80 text-blue-300 border-blue-800 text-[10px]">
              Standard 3.0m Tray Lengths
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Commercial tray section breakdown, installation hardware estimates (@ 1.5m support span), and cable pull lengths.
          </p>
        </div>

        <Button
          onClick={onExportExcel}
          disabled={isExporting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 px-4 shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {isExporting ? 'Generating Report...' : 'Export Complete BOM to Excel'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tray Network</p>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {bom.total_tray_length_m} <span className="text-sm font-semibold text-slate-500">m</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Ruler className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Standard 3m Sections</p>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {bom.total_sections_3m} <span className="text-sm font-semibold text-slate-500">pcs</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Hardware & Accessories</p>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {totalAccessoriesCount} <span className="text-sm font-semibold text-slate-500">units</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Cable Pull Run</p>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {bom.total_cable_length_m} <span className="text-sm font-semibold text-slate-500">m</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CableIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: Cable Tray & Riser Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              1. Cable Tray & Multi-Level Riser Schedule
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Standard 3-meter commercially manufactured lengths
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Commercial Width</th>
                <th className="p-3">Side Height</th>
                <th className="p-3">Orientation</th>
                <th className="p-3 text-right">Total Net Length</th>
                <th className="p-3 text-right">Standard 3m Pieces</th>
                <th className="p-3 text-center">Segment Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bom.trays.map((tray, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    {tray.width_mm} mm
                  </td>
                  <td className="p-3 text-slate-600">{tray.height_mm} mm</td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={
                        tray.branch_type === 'vertical'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
                          : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      }
                    >
                      {tray.branch_type === 'vertical' ? 'Vertical Riser' : 'Horizontal Tray'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-medium text-slate-800">{tray.total_length_m} m</td>
                  <td className="p-3 text-right font-bold text-blue-700">{tray.section_count_3m} pcs</td>
                  <td className="p-3 text-center text-slate-500">{tray.branch_count}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={3} className="p-3 text-slate-900">Total Tray Network</td>
                <td className="p-3 text-right text-slate-900">{bom.total_tray_length_m} m</td>
                <td className="p-3 text-right text-blue-800">{bom.total_sections_3m} pcs</td>
                <td className="p-3 text-center text-slate-600">
                  {bom.trays.reduce((s, t) => s + t.branch_count, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Installation Hardware & Accessories */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. Installation Accessories & Structural Hardware
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            NEMA / IEC Standard Structural Accessories
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Item Description</th>
                <th className="p-3">Category</th>
                <th className="p-3">Engineering Specification</th>
                <th className="p-3 text-right">Estimated Qty</th>
                <th className="p-3 text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bom.accessories.map((acc, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="p-3 font-semibold text-slate-900">{acc.item_name}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px] bg-slate-50 font-medium">
                      {acc.category}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-600 max-w-md">{acc.description}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{acc.quantity}</td>
                  <td className="p-3 text-center text-slate-500 font-mono">{acc.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Cable Schedule Length Take-Off */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CableIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              3. Cable Schedule Length Take-Off
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Dijkstra shortest-path routed run aggregation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Cable Type / Category</th>
                <th className="p-3 text-center">Routed Cables</th>
                <th className="p-3 text-right">Total Routed Length</th>
                <th className="p-3 text-right">Average Pull Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bom.cables_summary.map((csum, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-900 uppercase">{csum.cable_type}</td>
                  <td className="p-3 text-center font-medium text-slate-700">{csum.cable_count}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">{csum.total_routed_length_m} m</td>
                  <td className="p-3 text-right text-slate-600">{csum.avg_length_m} m</td>
                </tr>
              ))}
              {/* Total Cable Row */}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td className="p-3 text-slate-900">Total All Routed Cables</td>
                <td className="p-3 text-center text-slate-900">
                  {bom.cables_summary.reduce((s, c) => s + c.cable_count, 0)}
                </td>
                <td className="p-3 text-right text-emerald-800">{bom.total_cable_length_m} m</td>
                <td className="p-3 text-right text-slate-600">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
