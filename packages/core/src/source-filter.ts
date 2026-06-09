import type { SessionSource } from "./types.js";

export type SourceFilterArg = SessionSource | "all";

/** Human-readable list for error messages, e.g. `claude, cursor, all`. */
export function formatAcceptedSourceList(
  availableIds: readonly string[]
): string {
  const sorted = [...availableIds].sort();
  return sorted.length > 0 ? `${sorted.join(", ")}, all` : "all";
}

/** Parse a CLI `--source` value against registered provider ids. */
export function parseSourceFilter(
  value: string,
  availableIds: readonly string[],
  label = "--source"
): SourceFilterArg {
  const v = value.trim().toLowerCase();
  if (v === "all") {
    return "all";
  }
  const match = availableIds.find((id) => id.toLowerCase() === v);
  if (match) {
    return match;
  }
  throw new Error(
    `Invalid ${label} "${value}". Accepted values: ${formatAcceptedSourceList(availableIds)} (default: all).`
  );
}

/** Parse an HTTP `?source=` query value against registered provider ids. */
export function parseSourceQueryParam(
  raw: unknown,
  availableIds: readonly string[],
  defaultValue: SourceFilterArg = "all"
): SourceFilterArg {
  if (raw === undefined || raw === null || raw === "") {
    return defaultValue;
  }
  if (typeof raw !== "string") {
    throw new Error(
      `Invalid source query parameter. Accepted values: ${formatAcceptedSourceList(availableIds)}.`
    );
  }
  return parseSourceFilter(raw, availableIds, "source query parameter");
}

export function sessionFilterForSource(
  source: SourceFilterArg
): { source?: SessionSource } {
  if (source === "all") {
    return {};
  }
  return { source };
}
