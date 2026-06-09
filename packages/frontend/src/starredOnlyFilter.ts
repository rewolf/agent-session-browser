export const STARRED_ONLY_FILTER_STORAGE_KEY = "asb.filters.starredOnly";

export function readStarredOnlyFilter(): boolean {
  try {
    return localStorage.getItem(STARRED_ONLY_FILTER_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeStarredOnlyFilter(enabled: boolean): void {
  try {
    localStorage.setItem(
      STARRED_ONLY_FILTER_STORAGE_KEY,
      enabled ? "true" : "false"
    );
  } catch {
    /* ignore */
  }
}
