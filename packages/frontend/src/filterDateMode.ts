export const FILTER_DATE_MODE_STORAGE_KEY = "asb.filters.dateMode";

export type FilterDateMode = "created" | "updated";

export function readFilterDateMode(): FilterDateMode {
  try {
    const value = localStorage.getItem(FILTER_DATE_MODE_STORAGE_KEY);
    if (value === "created" || value === "updated") {
      return value;
    }
  } catch {
    /* private mode / disabled storage */
  }
  return "created";
}

export function writeFilterDateMode(mode: FilterDateMode): void {
  try {
    localStorage.setItem(FILTER_DATE_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function formatFilterDateModeLabel(mode: FilterDateMode): string {
  return mode === "created" ? "Created" : "Updated";
}

export function filterDateModeAriaLabel(mode: FilterDateMode): string {
  const current = formatFilterDateModeLabel(mode);
  const alternative = formatFilterDateModeLabel(
    mode === "created" ? "updated" : "created"
  );
  return `Date filter applies to: ${current}. Click to switch to ${alternative}.`;
}
