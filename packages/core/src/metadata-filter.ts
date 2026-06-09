const METADATA_QUERY_PREFIX = "metadata.";

/**
 * Parse flat query keys like `metadata.gitBranch=main` into a metadata filter object.
 * Unknown keys are passed through unchanged.
 */
export function parseMetadataFilterFromQuery(
  query: Record<string, unknown>
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(query)) {
    if (!key.startsWith(METADATA_QUERY_PREFIX)) {
      continue;
    }
    const metaKey = key.slice(METADATA_QUERY_PREFIX.length);
    if (!metaKey) {
      continue;
    }
    if (typeof raw !== "string") {
      continue;
    }
    const value = raw.trim();
    if (value === "") {
      continue;
    }
    out[metaKey] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Parse CLI `--metadata key=value` pairs (repeatable). */
export function parseMetadataFilterFromCliPairs(
  pairs: string[] | undefined
): Record<string, string> | undefined {
  if (!pairs?.length) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!key || !value) {
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
