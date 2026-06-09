import {
  parseSourceQueryParam,
  sessionFilterForSource,
  type ProviderRegistry,
  type SourceFilterArg,
} from "@asb/core";

export type { SourceFilterArg };

export { sessionFilterForSource };

export function parseSourceQuery(
  raw: unknown,
  registry: ProviderRegistry,
  defaultValue: SourceFilterArg = "all"
): SourceFilterArg {
  const ids = registry.ids();
  return parseSourceQueryParam(raw, ids, defaultValue);
}
