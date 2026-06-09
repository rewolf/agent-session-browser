import {
  parseSourceFilter,
  sessionFilterForSource,
  type ProviderRegistry,
  type SessionSource,
  type SourceFilterArg,
} from "@asb/core";

export type { SourceFilterArg };

export { sessionFilterForSource };

export function parseSourceOption(
  value: string,
  registry: ProviderRegistry
): SourceFilterArg {
  const ids = registry.ids();
  return parseSourceFilter(value, ids, "--source");
}

export function sourceFilterLabel(source: SourceFilterArg): string {
  return source === "all" ? "all sources" : source;
}

export function cycleSourceFilter(
  current: SourceFilterArg,
  availableIds: readonly SessionSource[]
): SourceFilterArg {
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
