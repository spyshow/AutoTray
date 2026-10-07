'use client';

import React, { useState } from 'react';
import { FittingType, ReducerType } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select';
import { is45DegFitting } from '@/lib/fittings-engine';
import { Layers, ShieldCheck, CheckCircle2, ArrowRight, BookOpen, Eye, Info } from 'lucide-react';

export interface FittingCatalogItem {
  type: FittingType;
  name: string;
  apvName: string;
  category: 'Horizontal Junction' | 'Flat Bend' | 'Vertical Riser' | 'Termination' | 'Straight';
  description: string;
  ports: number;
  angle?: string;
  hasCover: boolean;
  coverName?: string;
}

export const FITTING_CATALOG_REGISTRY: Record<FittingType, FittingCatalogItem> = {
  horizontal_tee: {
    type: 'horizontal_tee',
    name: 'Horizontal Tee (T-Piece)',
    apvName: 'Equal Tee',
    category: 'Horizontal Junction',
    description: 'Standard 3-way 90° horizontal branch junction for dividing cable tray runs.',
    ports: 3,
    angle: '90° Branch',
    hasCover: true,
    coverName: 'Equal Tee Cover',
  },
  horizontal_half_tee: {
    type: 'horizontal_half_tee',
    name: 'Half Equal Tee (Offset Branch)',
    apvName: 'Half Equal Tee',
    category: 'Horizontal Junction',
    description: 'Asymmetric 3-way horizontal tee with offset branch run for tight plant clearances.',
    ports: 3,
    angle: '90° Offset',
    hasCover: true,
    coverName: 'Half Equal Tee Cover',
  },
  horizontal_cross: {
    type: 'horizontal_cross',
    name: 'Horizontal 4-Way Cross',
    apvName: 'Crosspiece',
    category: 'Horizontal Junction',
    description: '4-way symmetrical 90° cross junction distributing cables in 4 planar directions.',
    ports: 4,
    angle: '4-Way 90°',
    hasCover: true,
    coverName: 'Crosspiece Cover',
  },
  horizontal_elbow_90: {
    type: 'horizontal_elbow_90',
    name: 'Horizontal 90° Flat Bend',
    apvName: '90° Flat Bend',
    category: 'Flat Bend',
    description: 'Smooth 90° horizontal directional curve maintaining tray elevation.',
    ports: 2,
    angle: '90° Flat',
    hasCover: true,
    coverName: '90° Flat Bend Cover',
  },
  horizontal_elbow_45: {
    type: 'horizontal_elbow_45',
    name: 'Horizontal 45° Flat Bend',
    apvName: '45° Flat Bend',
    category: 'Flat Bend',
    description: 'Gentle 45° horizontal directional deflection around obstacles and structural columns.',
    ports: 2,
    angle: '45° Flat',
    hasCover: true,
    coverName: '45° Flat Bend Cover',
  },
  vertical_inside_riser: {
    type: 'vertical_inside_riser',
    name: 'Vertical 90° Inside Riser Bend',
    apvName: '90° Inside Riser',
    category: 'Vertical Riser',
    description: '90° vertical bend turning tray upward toward higher ceiling or mezzanine level.',
    ports: 2,
    angle: '90° Upward',
    hasCover: true,
    coverName: '90° Inside Riser Cover',
  },
  vertical_outside_riser: {
    type: 'vertical_outside_riser',
    name: 'Vertical 90° Outside Riser Bend',
    apvName: '90° Outside Riser',
    category: 'Vertical Riser',
    description: '90° vertical bend turning tray downward toward equipment or lower floor level.',
    ports: 2,
    angle: '90° Downward',
    hasCover: true,
    coverName: '90° Outside Riser Cover',
  },
  vertical_inside_riser_45: {
    type: 'vertical_inside_riser_45',
    name: 'Vertical 45° Inside Riser Bend',
    apvName: '45° Inside Riser',
    category: 'Vertical Riser',
    description: 'Gentle 45° vertical riser bend turning upward with reduced cable pulling tension.',
    ports: 2,
    angle: '45° Upward',
    hasCover: true,
    coverName: '45° Inside Riser Cover',
  },
  vertical_outside_riser_45: {
    type: 'vertical_outside_riser_45',
    name: 'Vertical 45° Outside Riser Bend',
    apvName: '45° Outside Riser',
    category: 'Vertical Riser',
    description: 'Gentle 45° vertical riser bend turning downward with smooth cable lay-in.',
    ports: 2,
    angle: '45° Downward',
    hasCover: true,
    coverName: '45° Outside Riser Cover',
  },
  vertical_downward_tee: {
    type: 'vertical_downward_tee',
    name: 'Vertical Downward Skewed Tee',
    apvName: 'Vertical Downward Skewed Tee',
    category: 'Horizontal Junction',
    description: 'Horizontal continuous header with a vertical downward skewed branch drop chute.',
    ports: 3,
    angle: '90° Down Drop',
    hasCover: true,
    coverName: 'Vertical Downward Tee Cover',
  },
  vertical_upward_tee: {
    type: 'vertical_upward_tee',
    name: 'Vertical Upward Skewed Tee',
    apvName: 'Vertical Upward Skewed Tee',
    category: 'Horizontal Junction',
    description: 'Horizontal continuous header with a vertical upward skewed branch riser chute.',
    ports: 3,
    angle: '90° Up Riser',
    hasCover: true,
    coverName: 'Vertical Upward Tee Cover',
  },
  skewed_downward_bend: {
    type: 'skewed_downward_bend',
    name: 'Right Downward Skewed Bend',
    apvName: 'Right Downward Skewed Bend',
    category: 'Vertical Riser',
    description: 'Compound 3D transition combining horizontal deflection with downward vertical drop.',
    ports: 2,
    angle: '3D Compound',
    hasCover: false,
  },
  electrical_board_outlet: {
    type: 'electrical_board_outlet',
    name: 'Electrical Board Outlet / Drop Flange',
    apvName: 'Electrical Board Outlet',
    category: 'Termination',
    description: 'Flanged transition collar for direct top or bottom cable entry into switchboards.',
    ports: 1,
    angle: 'Terminal Drop',
    hasCover: false,
  },
  straight_coupler: {
    type: 'straight_coupler',
    name: 'Straight Splice Coupler',
    apvName: 'Splice Coupler Set',
    category: 'Straight',
    description: 'Twin side-rail splice connecting plates with carriage bolts for in-line jointing.',
    ports: 2,
    angle: 'In-Line 180°',
    hasCover: false,
  },
  closed_bend: {
    type: 'closed_bend',
    name: 'Closed Bend / Terminal End',
    apvName: 'Closed Bend',
    category: 'Termination',
    description: 'Terminal closed 90° bend sealing the tray end against dust and ingress.',
    ports: 1,
    angle: 'Terminated',
    hasCover: false,
  },
  end_cap: {
    type: 'end_cap',
    name: 'End Cap / Terminal Drop',
    apvName: 'End Cap Plate',
    category: 'Termination',
    description: 'Terminal blanking end plate or cable conduit drop bracket at run termination.',
    ports: 1,
    angle: 'Terminated',
    hasCover: false,
  },
  none: {
    type: 'none',
    name: 'None / Straight Pass-Through',
    apvName: 'Continuous Tray Run',
    category: 'Straight',
    description: 'Unbroken continuous cable tray run with no fitting or direction transition.',
    ports: 2,
    angle: 'Straight 180°',
    hasCover: false,
  },
};

export interface ReducerCatalogItem {
  type: ReducerType;
  name: string;
  apvName: string;
  category: string;
  description: string;
  geometry: string;
  hasCover: boolean;
  coverName?: string;
}

export const REDUCER_CATALOG_REGISTRY: Record<ReducerType, ReducerCatalogItem> = {
  concentric: {
    type: 'concentric',
    name: 'Concentric Reducer',
    apvName: 'Reducer',
    category: 'Reducer' as any,
    description: 'Symmetrical in-line width reduction centered along the longitudinal tray centerline.',
    geometry: 'Symmetric Centerline',
    hasCover: true,
    coverName: 'Reducer Cover',
  },
  eccentric_left: {
    type: 'eccentric_left',
    name: 'Eccentric Left Reducer',
    apvName: 'Left Reducer',
    category: 'Reducer' as any,
    description: 'Asymmetric reducer maintaining a flat straight left side-rail (ideal for wall mounting).',
    geometry: 'Straight Left Rail',
    hasCover: true,
    coverName: 'Left Reducer Cover',
  },
  eccentric_right: {
    type: 'eccentric_right',
    name: 'Eccentric Right Reducer',
    apvName: 'Right Reducer',
    category: 'Reducer' as any,
    description: 'Asymmetric reducer maintaining a flat straight right side-rail (ideal for wall mounting).',
    geometry: 'Straight Right Rail',
    hasCover: true,
    coverName: 'Right Reducer Cover',
  },
  height_reducer: {
    type: 'height_reducer',
    name: 'Height Reducer (Side Flange Step)',
    apvName: 'Height Reducer',
    category: 'Reducer' as any,
    description: 'Vertical step transition reducing tray side height/depth (e.g., 100mm down to 60mm).',
    geometry: 'Flange Depth Step-Down',
    hasCover: false,
  },
};

// Common SVG Definitions (Gradients & Filters)
const SvgDefs = () => (
  <defs>
    {/* Metallic Steel Gradient (Main body) */}
    <linearGradient id="apvMetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#F1F5F9" />
      <stop offset="35%" stopColor="#CBD5E1" />
      <stop offset="70%" stopColor="#94A3B8" />
      <stop offset="100%" stopColor="#64748B" />
    </linearGradient>
    {/* Dark Side-Rail Wall Gradient */}
    <linearGradient id="apvWall" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#94A3B8" />
      <stop offset="50%" stopColor="#64748B" />
      <stop offset="100%" stopColor="#475569" />
    </linearGradient>
    {/* Highlight Edge Gradient */}
    <linearGradient id="apvHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
      <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.2" />
    </linearGradient>
    {/* Accent Port Gradient (Amber/Indigo) */}
    <linearGradient id="apvPort" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#6366F1" />
      <stop offset="100%" stopColor="#4338CA" />
    </linearGradient>
  </defs>
);

// Individual Engineering SVG Illustrations (Axonometric 2.5D with Tray Rails & Perforations)
export const FittingIllustration: React.FC<{
  type: FittingType;
  size?: number;
  className?: string;
}> = ({ type, size = 48, className = '' }) => {
  const s = size;

  switch (type) {
    case 'horizontal_tee':
      // Equal Tee: Main through run with 90 deg branch
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Base Bed */}
          <path
            d="M 12 32 L 36 32 C 38 32 40 34 40 36 L 40 84 C 40 86 42 88 44 88 L 56 88 C 58 88 60 86 60 84 L 60 36 C 60 34 62 32 64 32 L 88 32 C 90 32 92 30 92 28 L 92 16 C 92 14 90 12 88 12 L 12 12 C 10 12 8 14 8 16 L 8 28 C 8 30 10 32 12 32 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Perforation Slots */}
          <line x1="20" y1="22" x2="32" y2="22" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          <line x1="46" y1="22" x2="54" y2="22" stroke="#64748B" strokeWidth="2.5" />
          <line x1="68" y1="22" x2="80" y2="22" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          <line x1="50" y1="42" x2="50" y2="76" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          {/* Inner Bend Fillets (Radius) */}
          <path d="M 36 32 Q 40 32 40 36" fill="none" stroke="#475569" strokeWidth="2" />
          <path d="M 64 32 Q 60 32 60 36" fill="none" stroke="#475569" strokeWidth="2" />
          {/* Outer Side Rails (Flanges with 3D depth) */}
          <rect x="8" y="10" width="84" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="8" y="28" width="28" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="64" y="28" width="28" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="38" y="36" width="4" height="52" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="58" y="36" width="4" height="52" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          {/* Port Indicators */}
          <circle cx="8" cy="22" r="3" fill="#6366F1" />
          <circle cx="92" cy="22" r="3" fill="#6366F1" />
          <circle cx="50" cy="88" r="3" fill="#F59E0B" />
        </svg>
      );

    case 'horizontal_half_tee':
      // Half Equal Tee: Asymmetric / offset side branch
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 12 36 L 28 36 C 30 36 32 38 32 40 L 32 84 C 32 86 34 88 36 88 L 48 88 C 50 88 52 86 52 84 L 52 36 L 88 36 C 90 36 92 34 92 32 L 92 16 C 92 14 90 12 88 12 L 12 12 C 10 12 8 14 8 16 L 8 32 C 8 34 10 36 12 36 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          <line x1="18" y1="24" x2="82" y2="24" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          <line x1="42" y1="44" x2="42" y2="78" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          <rect x="8" y="10" width="84" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="8" y="34" width="22" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="52" y="34" width="40" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="30" y="40" width="4" height="48" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="50" y="40" width="4" height="48" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
        </svg>
      );

    case 'horizontal_cross':
      // Crosspiece: 4-Way Cross
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 38 12 L 62 12 L 62 38 L 88 38 L 88 62 L 62 62 L 62 88 L 38 88 L 38 62 L 12 62 L 12 38 L 38 38 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Cross Perforations */}
          <line x1="50" y1="18" x2="50" y2="82" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          <line x1="18" y1="50" x2="82" y2="50" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          {/* Inner Corner Fillets */}
          <path d="M 38 38 Q 42 42 38 42" fill="none" stroke="#475569" strokeWidth="1.5" />
          <path d="M 62 38 Q 58 42 62 42" fill="none" stroke="#475569" strokeWidth="1.5" />
          <path d="M 38 62 Q 42 58 38 58" fill="none" stroke="#475569" strokeWidth="1.5" />
          <path d="M 62 62 Q 58 58 62 58" fill="none" stroke="#475569" strokeWidth="1.5" />
          {/* Outer Side Rails */}
          <rect x="36" y="10" width="28" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="36" y="86" width="28" height="4" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="10" y="36" width="4" height="28" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          <rect x="86" y="36" width="4" height="28" rx="1.5" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1" />
          {/* Port Nodes */}
          <circle cx="50" cy="12" r="2.5" fill="#6366F1" />
          <circle cx="50" cy="88" r="2.5" fill="#6366F1" />
          <circle cx="12" cy="50" r="2.5" fill="#6366F1" />
          <circle cx="88" cy="50" r="2.5" fill="#6366F1" />
        </svg>
      );

    case 'horizontal_elbow_90':
      // 90 Flat Bend
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 12 14 L 56 14 C 74 14 88 28 88 46 L 88 88 L 66 88 L 66 52 C 66 42 58 34 48 34 L 12 34 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Arc Perforation Slots */}
          <path d="M 18 24 L 52 24 C 64 24 76 34 76 48 L 76 82" fill="none" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          {/* Outer Curved Flange */}
          <path d="M 12 12 L 56 12 C 76 12 90 26 90 46 L 90 88" fill="none" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          {/* Inner Curved Flange */}
          <path d="M 12 36 L 46 36 C 56 36 64 44 64 54 L 64 88" fill="none" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          {/* Ports */}
          <circle cx="12" cy="24" r="3" fill="#6366F1" />
          <circle cx="76" cy="88" r="3" fill="#6366F1" />
        </svg>
      );

    case 'horizontal_elbow_45':
      // 45 Flat Bend
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 12 24 L 46 24 L 78 56 L 78 82 L 58 82 L 32 56 L 12 56 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* 45 degree path dashed center */}
          <path d="M 16 40 L 40 40 L 68 68 L 68 80" fill="none" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          {/* Rails */}
          <path d="M 12 22 L 48 22 L 80 54 L 80 82" fill="none" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <path d="M 12 58 L 30 58 L 56 84" fill="none" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="12" cy="40" r="3" fill="#6366F1" />
          <circle cx="68" cy="82" r="3" fill="#6366F1" />
        </svg>
      );

    case 'vertical_inside_riser':
      // 90 Inside Riser: Turns UPWARDS (Inside curve facing front)
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Isometric upward curve */}
          <path
            d="M 16 76 L 56 76 C 68 76 76 66 76 52 L 76 16 L 62 16 L 62 50 C 62 58 56 64 48 64 L 16 64 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Riser Rung/Perforation Ribs */}
          <line x1="28" y1="64" x2="28" y2="76" stroke="#475569" strokeWidth="2" />
          <line x1="40" y1="64" x2="40" y2="76" stroke="#475569" strokeWidth="2" />
          <line x1="52" y1="62" x2="56" y2="74" stroke="#475569" strokeWidth="2" />
          <line x1="62" y1="46" x2="74" y2="48" stroke="#475569" strokeWidth="2" />
          <line x1="62" y1="32" x2="76" y2="32" stroke="#475569" strokeWidth="2" />
          {/* Inner curved rail */}
          <path d="M 16 62 L 48 62 C 58 62 64 56 64 48 L 64 16" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          {/* Outer curved rail */}
          <path d="M 16 78 L 56 78 C 70 78 78 68 78 52 L 78 16" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 69 12 L 69 22 M 65 17 L 69 12 L 73 17" stroke="#10B981" strokeWidth="2" fill="none" />
          <text x="64" y="94" fontSize="8" fontWeight="bold" fill="#047857">UP 90°</text>
        </svg>
      );

    case 'vertical_outside_riser':
      // 90 Outside Riser: Turns DOWNWARDS (Outside curve over the top)
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Isometric downward curve */}
          <path
            d="M 16 24 L 56 24 C 68 24 76 34 76 48 L 76 84 L 62 84 L 62 50 C 62 42 56 36 48 36 L 16 36 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Rung ribs */}
          <line x1="28" y1="24" x2="28" y2="36" stroke="#475569" strokeWidth="2" />
          <line x1="40" y1="24" x2="40" y2="36" stroke="#475569" strokeWidth="2" />
          <line x1="52" y1="26" x2="56" y2="38" stroke="#475569" strokeWidth="2" />
          <line x1="62" y1="54" x2="74" y2="52" stroke="#475569" strokeWidth="2" />
          <line x1="62" y1="68" x2="76" y2="68" stroke="#475569" strokeWidth="2" />
          {/* Flanges */}
          <path d="M 16 22 L 56 22 C 70 22 78 32 78 48 L 78 84" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 16 38 L 48 38 C 58 38 64 44 64 52 L 64 84" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 69 88 L 69 78 M 65 83 L 69 88 L 73 83" stroke="#F59E0B" strokeWidth="2" fill="none" />
          <text x="60" y="96" fontSize="8" fontWeight="bold" fill="#D97706">DOWN 90°</text>
        </svg>
      );

    case 'vertical_inside_riser_45':
      // 45 Inside Riser (Upward)
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 16 72 L 46 72 L 76 38 L 66 28 L 38 60 L 16 60 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          <line x1="28" y1="60" x2="28" y2="72" stroke="#475569" strokeWidth="2" />
          <line x1="42" y1="64" x2="50" y2="70" stroke="#475569" strokeWidth="2" />
          <line x1="56" y1="46" x2="64" y2="54" stroke="#475569" strokeWidth="2" />
          <path d="M 16 58 L 40 58 L 68 26" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 16 74 L 48 74 L 78 36" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          <text x="66" y="24" fontSize="8" fontWeight="bold" fill="#047857">UP 45°</text>
        </svg>
      );

    case 'vertical_outside_riser_45':
      // 45 Outside Riser (Downward)
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 16 28 L 46 28 L 76 62 L 66 72 L 38 40 L 16 40 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          <line x1="28" y1="28" x2="28" y2="40" stroke="#475569" strokeWidth="2" />
          <line x1="42" y1="34" x2="50" y2="42" stroke="#475569" strokeWidth="2" />
          <line x1="56" y1="52" x2="64" y2="60" stroke="#475569" strokeWidth="2" />
          <path d="M 16 26 L 48 26 L 78 60" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 16 42 L 40 42 L 68 74" fill="none" stroke="url(#apvWall)" strokeWidth="3.5" strokeLinecap="round" />
          <text x="58" y="86" fontSize="8" fontWeight="bold" fill="#D97706">DOWN 45°</text>
        </svg>
      );

    case 'vertical_downward_tee':
      // Vertical Downward Skewed Tee
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Main horizontal header */}
          <rect x="12" y="18" width="76" height="24" rx="2" fill="url(#apvMetal)" stroke="#334155" strokeWidth="2" />
          {/* Downward drop chute in 2.5D perspective */}
          <path
            d="M 36 34 L 64 34 L 58 84 L 42 84 Z"
            fill="url(#apvWall)"
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* Chute mouth opening */}
          <ellipse cx="50" cy="84" rx="8" ry="3" fill="#0F172A" />
          <line x1="20" y1="30" x2="80" y2="30" stroke="#64748B" strokeWidth="2" strokeDasharray="3 3" />
          <rect x="12" y="16" width="76" height="4" fill="url(#apvWall)" />
          <circle cx="12" cy="30" r="2.5" fill="#6366F1" />
          <circle cx="88" cy="30" r="2.5" fill="#6366F1" />
          <circle cx="50" cy="84" r="2.5" fill="#EF4444" />
        </svg>
      );

    case 'vertical_upward_tee':
      // Vertical Upward Skewed Tee
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Upward riser chute in 2.5D perspective */}
          <path
            d="M 42 16 L 58 16 L 64 66 L 36 66 Z"
            fill="url(#apvWall)"
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* Top chute mouth opening */}
          <ellipse cx="50" cy="16" rx="8" ry="3" fill="#0F172A" />
          {/* Main lower horizontal header */}
          <rect x="12" y="58" width="76" height="24" rx="2" fill="url(#apvMetal)" stroke="#334155" strokeWidth="2" />
          <line x1="20" y1="70" x2="80" y2="70" stroke="#64748B" strokeWidth="2" strokeDasharray="3 3" />
          <rect x="12" y="56" width="76" height="4" fill="url(#apvWall)" />
          {/* Port connection dots */}
          <circle cx="12" cy="70" r="2.5" fill="#6366F1" />
          <circle cx="88" cy="70" r="2.5" fill="#6366F1" />
          <circle cx="50" cy="16" r="2.5" fill="#10B981" />
        </svg>
      );

    case 'skewed_downward_bend':
      // Right Downward Skewed Bend
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 16 24 L 44 24 L 78 68 L 78 86 L 56 86 L 28 46 L 16 46 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          <path d="M 44 24 L 78 68" stroke="#1E293B" strokeWidth="4" fill="none" />
          <path d="M 16 46 L 28 46 L 56 86" stroke="#475569" strokeWidth="3" fill="none" />
          <line x1="24" y1="35" x2="68" y2="76" stroke="#64748B" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );

    case 'electrical_board_outlet':
      // Electrical Board Outlet (Flanged drop into cabinet)
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Cabinet Top Outline */}
          <rect x="18" y="52" width="64" height="40" rx="3" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
          <rect x="24" y="60" width="52" height="26" rx="2" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Outlet Throat / Tray Drop Collar */}
          <path
            d="M 32 16 L 68 16 L 72 48 L 28 48 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Flange plate */}
          <rect x="22" y="46" width="56" height="8" rx="2" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="1.5" />
          <circle cx="26" cy="50" r="1.5" fill="#FFFFFF" />
          <circle cx="74" cy="50" r="1.5" fill="#FFFFFF" />
          <circle cx="50" cy="16" r="3" fill="#6366F1" />
          <text x="32" y="76" fontSize="7" fontWeight="bold" fill="#475569">PANEL</text>
        </svg>
      );

    case 'straight_coupler':
      // Straight Splice Coupler
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Tray left and right sections */}
          <rect x="8" y="28" width="38" height="44" fill="url(#apvMetal)" stroke="#334155" strokeWidth="1.5" />
          <rect x="54" y="28" width="38" height="44" fill="url(#apvMetal)" stroke="#334155" strokeWidth="1.5" />
          {/* Coupler Fishplate over the seam */}
          <rect x="36" y="24" width="28" height="52" rx="3" fill="url(#apvWall)" stroke="#1E293B" strokeWidth="2" />
          {/* Splice bolts with cross pattern */}
          <circle cx="43" cy="34" r="3" fill="#F1F5F9" stroke="#1E293B" strokeWidth="1" />
          <circle cx="57" cy="34" r="3" fill="#F1F5F9" stroke="#1E293B" strokeWidth="1" />
          <circle cx="43" cy="50" r="3" fill="#F1F5F9" stroke="#1E293B" strokeWidth="1" />
          <circle cx="57" cy="50" r="3" fill="#F1F5F9" stroke="#1E293B" strokeWidth="1" />
          <circle cx="43" cy="66" r="3" fill="#F1F5F9" stroke="#1E293B" strokeWidth="1" />
          <circle cx="57" cy="66" r="3" fill="#F1F5F9" stroke="#1E293B" strokeWidth="1" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );

    case 'closed_bend':
    case 'end_cap':
      // Closed Bend / End Cap
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <path
            d="M 16 28 L 62 28 C 76 28 84 38 84 50 C 84 62 76 72 62 72 L 16 72 Z"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Terminal Blanking Wall */}
          <path d="M 62 28 C 76 28 84 38 84 50 C 84 62 76 72 62 72" fill="none" stroke="url(#apvWall)" strokeWidth="5" />
          {/* Side rails */}
          <rect x="16" y="24" width="46" height="4" rx="1.5" fill="url(#apvWall)" />
          <rect x="16" y="72" width="46" height="4" rx="1.5" fill="url(#apvWall)" />
          {/* Stop barrier cross */}
          <line x1="72" y1="42" x2="80" y2="58" stroke="#EF4444" strokeWidth="2.5" />
          <line x1="80" y1="42" x2="72" y2="58" stroke="#EF4444" strokeWidth="2.5" />
          <circle cx="16" cy="50" r="3" fill="#6366F1" />
        </svg>
      );

    case 'none':
    default:
      // None / Straight Pass-Through
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          <rect x="12" y="28" width="76" height="44" rx="2" fill="url(#apvMetal)" stroke="#334155" strokeWidth="2" />
          <line x1="12" y1="50" x2="88" y2="50" stroke="#64748B" strokeWidth="2" strokeDasharray="4 4" />
          <rect x="12" y="26" width="76" height="4" rx="1.5" fill="url(#apvWall)" />
          <rect x="12" y="70" width="76" height="4" rx="1.5" fill="url(#apvWall)" />
          <circle cx="12" cy="50" r="3" fill="#6366F1" />
          <circle cx="88" cy="50" r="3" fill="#6366F1" />
        </svg>
      );
  }
};

// Reducer Engineering SVG Illustrations
export const ReducerIllustration: React.FC<{
  type: ReducerType;
  size?: number;
  className?: string;
}> = ({ type, size = 44, className = '' }) => {
  const s = size;

  switch (type) {
    case 'concentric':
      // Concentric: Both sides taper symmetrically into centerline
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Trapezoid bed */}
          <polygon
            points="12,18 42,32 88,32 88,68 42,68 12,82"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Centerline */}
          <line x1="12" y1="50" x2="88" y2="50" stroke="#64748B" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Sloped Rails */}
          <line x1="12" y1="18" x2="42" y2="32" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" y1="32" x2="88" y2="32" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <line x1="12" y1="82" x2="42" y2="68" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" y1="68" x2="88" y2="68" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <text x="14" y="53" fontSize="9" fontWeight="bold" fill="#1E293B">W₁</text>
          <text x="70" y="53" fontSize="9" fontWeight="bold" fill="#1E293B">W₂</text>
        </svg>
      );

    case 'eccentric_left':
      // Left Reducer: Flat straight left edge, right edge tapers
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Straight top (left in plane), sloped bottom */}
          <polygon
            points="12,24 88,24 88,58 42,78 12,78"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Flat top rail */}
          <line x1="12" y1="24" x2="88" y2="24" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" />
          {/* Sloped bottom rail */}
          <line x1="12" y1="78" x2="42" y2="78" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" y1="78" x2="88" y2="58" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <line x1="88" y1="24" x2="88" y2="58" stroke="url(#apvWall)" strokeWidth="2" />
          <text x="14" y="54" fontSize="9" fontWeight="bold" fill="#1E293B">W₁</text>
          <text x="70" y="44" fontSize="9" fontWeight="bold" fill="#1E293B">W₂</text>
          <text x="36" y="18" fontSize="7" fontWeight="bold" fill="#2563EB">FLAT LEFT</text>
        </svg>
      );

    case 'eccentric_right':
      // Right Reducer: Flat straight right edge, left edge tapers
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Sloped top, straight bottom */}
          <polygon
            points="12,22 42,22 88,42 88,76 12,76"
            fill="url(#apvMetal)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Sloped top rail */}
          <line x1="12" y1="22" x2="42" y2="22" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" y1="22" x2="88" y2="42" stroke="url(#apvWall)" strokeWidth="4" strokeLinecap="round" />
          {/* Flat bottom rail */}
          <line x1="12" y1="76" x2="88" y2="76" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" />
          <text x="14" y="52" fontSize="9" fontWeight="bold" fill="#1E293B">W₁</text>
          <text x="70" y="62" fontSize="9" fontWeight="bold" fill="#1E293B">W₂</text>
          <text x="34" y="90" fontSize="7" fontWeight="bold" fill="#2563EB">FLAT RIGHT</text>
        </svg>
      );

    case 'height_reducer':
      // Height Reducer: Side profile step down in tray height
      return (
        <svg viewBox="0 0 100 100" width={s} height={s} className={className}>
          <SvgDefs />
          {/* Side elevation profile */}
          <polygon
            points="12,20 44,20 60,46 88,46 88,80 12,80"
            fill="url(#apvWall)"
            stroke="#1E293B"
            strokeWidth="2"
          />
          <line x1="12" y1="20" x2="44" y2="20" stroke="#F8FAFC" strokeWidth="2.5" />
          <line x1="44" y1="20" x2="60" y2="46" stroke="#F8FAFC" strokeWidth="2.5" />
          <line x1="60" y1="46" x2="88" y2="46" stroke="#F8FAFC" strokeWidth="2.5" />
          <line x1="12" y1="80" x2="88" y2="80" stroke="#0F172A" strokeWidth="3" />
          {/* Height indicators */}
          <line x1="22" y1="24" x2="22" y2="76" stroke="#FCD34D" strokeWidth="1.5" />
          <line x1="76" y1="50" x2="76" y2="76" stroke="#FCD34D" strokeWidth="1.5" />
          <text x="16" y="52" fontSize="8" fontWeight="bold" fill="#FEF08A">H₁</text>
          <text x="70" y="66" fontSize="8" fontWeight="bold" fill="#FEF08A">H₂</text>
        </svg>
      );
  }
};

/**
 * Interactive Modal for inspecting a specific fitting in high resolution with APV specifications.
 */
export const FittingDetailModal: React.FC<{
  type: FittingType | null;
  nodeId?: string;
  nominalSize?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  includeCover?: boolean;
  onToggleCover?: (include: boolean) => void;
}> = ({ type, nodeId, nominalSize, open, onOpenChange, includeCover, onToggleCover }) => {
  if (!type) return null;
  const meta = FITTING_CATALOG_REGISTRY[type];
  if (!meta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-slate-200 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
              {meta.category}
            </Badge>
            {nodeId && (
              <Badge variant="outline" className="font-mono bg-slate-100 text-slate-800 text-[10px]">
                Node {nodeId}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg font-black text-slate-900 mt-1">
            {meta.apvName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {meta.name}
          </DialogDescription>
        </DialogHeader>

        {/* 3D Visual Rendering Card */}
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100/80 rounded-xl border border-slate-200/80 relative overflow-hidden my-3">
          <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-400 uppercase tracking-widest">
            2.5D Isometric Model
          </div>
          <div className="w-40 h-40 flex items-center justify-center drop-shadow-md">
            <FittingIllustration type={type} size={150} />
          </div>
          {nominalSize && (
            <div className="mt-2 text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              Nominal: {nominalSize}
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Port Geometry</span>
            <span className="font-bold text-slate-800">{meta.ports} Ports ({meta.angle || 'Standard'})</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">APV Standard</span>
            <span className="font-bold text-slate-800">Solid / Perforated</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed mt-2">
          {meta.description}
        </p>

        {/* Matching Cover Option */}
        {meta.hasCover && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 mt-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="text-xs font-bold text-indigo-950">{meta.coverName}</div>
                <div className="text-[10px] text-indigo-600">Include matching top cover in Bill of Materials</div>
              </div>
            </div>
            {onToggleCover && (
              <input
                type="checkbox"
                checked={includeCover || false}
                onChange={e => onToggleCover(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer"
              />
            )}
          </div>
        )}

        <div className="flex justify-end pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-700"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Interactive Visual Guide Modal displaying the complete APV Solid/Perforated Systems Catalog.
 */
export const FittingGuideModal: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFitting?: (type: FittingType) => void;
}> = ({ open, onOpenChange, onSelectFitting }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Catalog' },
    { id: 'Horizontal Junction', label: 'Tees & Crosses' },
    { id: 'Flat Bend', label: 'Flat Bends (Elbows)' },
    { id: 'Vertical Riser', label: 'Vertical Risers' },
    { id: 'Reducer', label: 'In-Line Reducers' },
    { id: 'Termination', label: 'Outlets & Ends' },
  ];

  const fittingsList = Object.values(FITTING_CATALOG_REGISTRY);
  const reducersList = Object.values(REDUCER_CATALOG_REGISTRY);

  const filteredFittings = activeCategory === 'all'
    ? fittingsList
    : fittingsList.filter(f => f.category === activeCategory);

  const showReducers = activeCategory === 'all' || activeCategory === 'Reducer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white border-slate-200 shadow-2xl p-6 rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-left border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <DialogTitle className="text-lg font-black text-slate-900">
              APV Cable Tray Systems &mdash; Engineering Fittings &amp; Reducers Catalog
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Visual reference from the APV Solid / Perforated Systems technical catalog. Click any fitting to inspect details or configure.
          </DialogDescription>
        </DialogHeader>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid of Fittings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {filteredFittings.map(item => (
            <div
              key={item.type}
              onClick={() => {
                if (onSelectFitting) {
                  onSelectFitting(item.type);
                  onOpenChange(false);
                }
              }}
              className="group p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-2">
                  <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-600">
                    {item.category}
                  </Badge>
                  {item.hasCover && (
                    <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Cover
                    </span>
                  )}
                </div>

                {/* SVG Visual */}
                <div className="h-28 flex items-center justify-center bg-slate-50/70 rounded-lg group-hover:bg-indigo-50/40 transition-colors p-2">
                  <FittingIllustration type={item.type} size={84} />
                </div>

                <div className="mt-2.5">
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {item.apvName}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>{item.ports} Ports</span>
                <span className="font-semibold text-indigo-600 group-hover:underline">Select &rarr;</span>
              </div>
            </div>
          ))}

          {/* Reducers Section */}
          {showReducers &&
            reducersList.map(red => (
              <div
                key={red.type}
                className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/20 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-200">
                      In-Line Reducer
                    </Badge>
                    {red.hasCover && (
                      <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> Cover
                      </span>
                    )}
                  </div>

                  <div className="h-28 flex items-center justify-center bg-amber-50/50 rounded-lg p-2">
                    <ReducerIllustration type={red.type} size={80} />
                  </div>

                  <div className="mt-2.5">
                    <h4 className="text-xs font-black text-slate-900">
                      {red.apvName}
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">
                      {red.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                      {red.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-amber-100 text-[10px] text-amber-900 font-mono">
                  {red.geometry}
                </div>
              </div>
            ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-700"
          >
            Close Guide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Rich Dropdown Selector for Cable Tray Fittings featuring 2.5D SVGs in the trigger and menu.
 */
export const FittingSelectDropdown: React.FC<{
  value: FittingType;
  onChange: (value: FittingType) => void;
  disabled?: boolean;
  className?: string;
}> = ({ value, onChange, disabled, className = '' }) => {
  const meta = FITTING_CATALOG_REGISTRY[value] || FITTING_CATALOG_REGISTRY.none;
  const is45 = is45DegFitting(value);

  return (
    <Select value={value} onValueChange={val => onChange(val as FittingType)} disabled={disabled}>
      <SelectTrigger
        className={`h-9 w-full text-xs font-semibold px-2 py-1 bg-white border-slate-200 hover:border-indigo-400 focus:ring-1 focus:ring-indigo-500 rounded-md shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-2 overflow-hidden text-left flex-1 min-w-0">
          <div className="w-6 h-6 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
            <FittingIllustration type={value} size={22} />
          </div>
          <span className="font-bold text-slate-800 text-xs truncate">
            {meta.apvName}
          </span>
          {is45 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-300 font-bold ml-auto flex-shrink-0">
              2× Pair
            </Badge>
          )}
        </div>
      </SelectTrigger>

      <SelectContent className="max-h-96 w-80 sm:w-96 p-1.5 bg-white border-slate-200 shadow-2xl">
        <SelectGroup>
          <SelectLabel>Horizontal Junctions</SelectLabel>
          <SelectItem value="horizontal_tee" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="horizontal_tee" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Equal Tee</span>
                <span className="text-[10px] text-slate-500">Horizontal 3-Way 90° Junction</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="horizontal_half_tee" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="horizontal_half_tee" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Half Equal Tee</span>
                <span className="text-[10px] text-slate-500">Offset Asymmetric Branch</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="horizontal_cross" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="horizontal_cross" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Crosspiece (4-Way Cross)</span>
                <span className="text-[10px] text-slate-500">4-Way 90° Planar Distribution</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="vertical_downward_tee" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="vertical_downward_tee" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Vertical Downward Skewed Tee</span>
                <span className="text-[10px] text-slate-500">Horizontal Header with Down Chute Drop</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="vertical_upward_tee" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="vertical_upward_tee" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Vertical Upward Skewed Tee</span>
                <span className="text-[10px] text-slate-500">Horizontal Header with Up Chute Riser</span>
              </div>
            </div>
          </SelectItem>
        </SelectGroup>

        <SelectSeparator />

        <SelectGroup>
          <SelectLabel>Flat Bends (Horizontal Elbows)</SelectLabel>
          <SelectItem value="horizontal_elbow_90" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="horizontal_elbow_90" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">90° Flat Bend</span>
                <span className="text-[10px] text-slate-500">Standard 90° Directional Turn</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="horizontal_elbow_45" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-amber-50/50 border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="horizontal_elbow_45" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900">45° Flat Bend</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-800 border-amber-300 font-bold">
                    Qty: 2× Pair
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500">Smooth 45° Sweep Turn (2 pcs per offset)</span>
              </div>
            </div>
          </SelectItem>
        </SelectGroup>

        <SelectSeparator />

        <SelectGroup>
          <SelectLabel>Vertical Risers &amp; Offsets</SelectLabel>
          <SelectItem value="vertical_inside_riser" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="vertical_inside_riser" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">90° Inside Riser (Upward)</span>
                <span className="text-[10px] text-slate-500">Vertical 90° bend to higher level</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="vertical_outside_riser" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="vertical_outside_riser" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">90° Outside Riser (Downward)</span>
                <span className="text-[10px] text-slate-500">Vertical 90° bend to lower level</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="vertical_inside_riser_45" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-amber-50/50 border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="vertical_inside_riser_45" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900">45° Inside Riser (Upward)</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-800 border-amber-300 font-bold">
                    Qty: 2× Pair
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500">Gentle vertical riser jog (2 pcs per offset)</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="vertical_outside_riser_45" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-amber-50/50 border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="vertical_outside_riser_45" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900">45° Outside Riser (Downward)</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-800 border-amber-300 font-bold">
                    Qty: 2× Pair
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500">Gentle vertical drop jog (2 pcs per offset)</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="skewed_downward_bend" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="skewed_downward_bend" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Right Downward Skewed Bend</span>
                <span className="text-[10px] text-slate-500">3D compound turn &amp; drop</span>
              </div>
            </div>
          </SelectItem>
        </SelectGroup>

        <SelectSeparator />

        <SelectGroup>
          <SelectLabel>Terminations &amp; Drops</SelectLabel>
          <SelectItem value="electrical_board_outlet" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="electrical_board_outlet" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Electrical Board Outlet</span>
                <span className="text-[10px] text-slate-500">Cabinet entry flanged drop collar</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="straight_coupler" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="straight_coupler" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Straight Splice Coupler</span>
                <span className="text-[10px] text-slate-500">In-line splice connector plates</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="closed_bend" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="closed_bend" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">Closed Bend</span>
                <span className="text-[10px] text-slate-500">Terminal 90° sealed termination</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="end_cap" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="end_cap" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">End Cap / Terminal Drop</span>
                <span className="text-[10px] text-slate-500">Blanking plate / conduit drop</span>
              </div>
            </div>
          </SelectItem>

          <SelectItem value="none" className="py-1.5 cursor-pointer">
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
                <FittingIllustration type="none" size={28} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900">None / Pass-Through</span>
                <span className="text-[10px] text-slate-500">Continuous straight tray run</span>
              </div>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

/**
 * Rich Dropdown Selector for Cable Tray Reducers featuring SVGs in the trigger and menu.
 */
export const ReducerSelectDropdown: React.FC<{
  value: ReducerType;
  onChange: (value: ReducerType) => void;
  disabled?: boolean;
  className?: string;
}> = ({ value, onChange, disabled, className = '' }) => {
  const meta = REDUCER_CATALOG_REGISTRY[value] || REDUCER_CATALOG_REGISTRY.concentric;

  return (
    <Select value={value} onValueChange={val => onChange(val as ReducerType)} disabled={disabled}>
      <SelectTrigger
        className={`h-7 px-2 text-[11px] font-semibold bg-white border-slate-200 hover:border-amber-400 focus:ring-1 focus:ring-amber-500 rounded ${className}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden text-left flex-1 min-w-0">
          <div className="w-4 h-4 rounded bg-white border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
            <ReducerIllustration type={value} size={14} />
          </div>
          <span className="truncate">{meta.apvName}</span>
        </div>
      </SelectTrigger>

      <SelectContent className="w-64 p-1 bg-white border-slate-200 shadow-xl">
        <SelectItem value="concentric" className="py-1.5 cursor-pointer">
          <div className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded bg-white border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
              <ReducerIllustration type="concentric" size={24} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs text-slate-900">Reducer (Concentric)</span>
              <span className="text-[10px] text-slate-500">Symmetric Centerline</span>
            </div>
          </div>
        </SelectItem>

        <SelectItem value="eccentric_left" className="py-1.5 cursor-pointer">
          <div className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded bg-white border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
              <ReducerIllustration type="eccentric_left" size={24} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs text-slate-900">Left Reducer</span>
              <span className="text-[10px] text-slate-500">Flat Straight Left Rail</span>
            </div>
          </div>
        </SelectItem>

        <SelectItem value="eccentric_right" className="py-1.5 cursor-pointer">
          <div className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded bg-white border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
              <ReducerIllustration type="eccentric_right" size={24} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs text-slate-900">Right Reducer</span>
              <span className="text-[10px] text-slate-500">Flat Straight Right Rail</span>
            </div>
          </div>
        </SelectItem>

        <SelectItem value="height_reducer" className="py-1.5 cursor-pointer">
          <div className="flex items-center gap-2 w-full">
            <div className="w-7 h-7 rounded bg-white border border-amber-200 flex items-center justify-center p-0.5 flex-shrink-0 shadow-2xs">
              <ReducerIllustration type="height_reducer" size={24} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs text-slate-900">Height Reducer</span>
              <span className="text-[10px] text-slate-500">Flange Depth Step-Down</span>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};


