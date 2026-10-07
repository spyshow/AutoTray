import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(val: number, decimals: number = 1): string {
  if (isNaN(val)) return "0.0";
  return val.toFixed(decimals);
}

/**
 * Auto-increments trailing or embedded digits in an identifier string while preserving zero-padding.
 * If no digits are found, appends '_1'.
 *
 * Examples:
 * - 'BR_L0_01' -> 'BR_L0_02'
 * - 'BR_L0_02' -> 'BR_L0_03'
 * - 'BR_L1_03' -> 'BR_L1_04'
 * - 'N01' -> 'N02'
 * - 'N011' -> 'N012'
 * - 'NODE_3' -> 'NODE_4'
 * - 'FEEDER' -> 'FEEDER_1'
 */
export function incrementIdentifier(str: string): string {
  if (!str) return "1";
  const match = str.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) {
    return `${str}_1`;
  }
  const prefix = match[1];
  const numStr = match[2];
  const suffix = match[3];
  const nextNum = parseInt(numStr, 10) + 1;
  const padded = String(nextNum).padStart(numStr.length, "0");
  return `${prefix}${padded}${suffix}`;
}
