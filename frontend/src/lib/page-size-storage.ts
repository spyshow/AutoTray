/**
 * Persistent storage utility for user pagination page-size preferences.
 * Saves preference to localStorage across browser reloads and tab navigation.
 */

const STORAGE_KEY_GLOBAL = 'autotray_lines_per_page';
export const ALLOWED_PAGE_SIZES = [10, 20, 50, 100] as const;
export type PageSizeOption = (typeof ALLOWED_PAGE_SIZES)[number];

export function getStoredPageSize(tableKey?: string, defaultSize: number = 10): number {
  if (typeof window === 'undefined') return defaultSize;
  try {
    const specificKey = tableKey ? `${STORAGE_KEY_GLOBAL}_${tableKey}` : null;
    const stored =
      (specificKey ? localStorage.getItem(specificKey) : null) ||
      localStorage.getItem(STORAGE_KEY_GLOBAL);

    if (!stored) return defaultSize;
    const parsed = parseInt(stored, 10);
    return ALLOWED_PAGE_SIZES.includes(parsed as PageSizeOption) ? parsed : defaultSize;
  } catch {
    return defaultSize;
  }
}

export function setStoredPageSize(size: number, tableKey?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!ALLOWED_PAGE_SIZES.includes(size as PageSizeOption)) return;
    localStorage.setItem(STORAGE_KEY_GLOBAL, String(size));
    if (tableKey) {
      localStorage.setItem(`${STORAGE_KEY_GLOBAL}_${tableKey}`, String(size));
    }
  } catch (err) {
    console.warn('Failed to save page size preference to localStorage:', err);
  }
}
