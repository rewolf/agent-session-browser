import type { FilterDateMode } from "./filterDateMode";
import { formatFilterDateModeLabel } from "./filterDateMode";

export const MSG_SEARCH_DATE_MODE_STORAGE_KEY = "asb.msgSearch.dateMode";

export function readMsgSearchDateMode(): FilterDateMode {
  try {
    const value = localStorage.getItem(MSG_SEARCH_DATE_MODE_STORAGE_KEY);
    if (value === "created" || value === "updated") {
      return value;
    }
  } catch {
    /* private mode / disabled storage */
  }
  return "updated";
}

export function writeMsgSearchDateMode(mode: FilterDateMode): void {
  try {
    localStorage.setItem(MSG_SEARCH_DATE_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function msgSearchDateModeAriaLabel(mode: FilterDateMode): string {
  const current = formatFilterDateModeLabel(mode);
  const alternative = formatFilterDateModeLabel(
    mode === "created" ? "updated" : "created"
  );
  return `Session dates filter applies to: ${current}. Click to switch to ${alternative}.`;
}
