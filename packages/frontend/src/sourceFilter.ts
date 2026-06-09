/** Session source filter for the UI (matches backend `?source=`). */
export type SourceFilter = "all" | string;

export const SOURCE_URL_PARAM = "source";

export function parseSourceFromSearch(
  search: string,
  availableIds: readonly string[] = []
): SourceFilter {
  const raw = new URLSearchParams(search).get(SOURCE_URL_PARAM);
  if (!raw) {
    return "all";
  }
  if (availableIds.length === 0 || !availableIds.includes(raw)) {
    return "all";
  }
  return raw;
}

/** API query value; omit when showing all sources. */
export function sourceFilterToQueryValue(
  filter: SourceFilter
): string | undefined {
  if (filter === "all") {
    return undefined;
  }
  return filter;
}

export function writeSourceFilterToUrl(filter: SourceFilter): void {
  const url = new URL(window.location.href);
  if (filter === "all") {
    url.searchParams.delete(SOURCE_URL_PARAM);
  } else {
    url.searchParams.set(SOURCE_URL_PARAM, filter);
  }
  window.history.replaceState({}, "", url.toString());
}

export function sourceFilterLabel(
  filter: SourceFilter,
  providersById: ReadonlyMap<string, { displayName: string }>
): string {
  if (filter === "all") {
    return "All Agents";
  }
  return providersById.get(filter)?.displayName ?? filter;
}

/** Cycle: all → first id → … → last id → all. */
export function cycleSourceFilter(
  current: SourceFilter,
  availableIds: readonly string[]
): SourceFilter {
  if (availableIds.length === 0) {
    return "all";
  }
  if (current === "all") {
    return availableIds[0]!;
  }
  const idx = availableIds.indexOf(current);
  if (idx === -1) {
    return "all";
  }
  if (idx === availableIds.length - 1) {
    return "all";
  }
  return availableIds[idx + 1]!;
}
