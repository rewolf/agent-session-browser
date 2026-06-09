/** CLI `--source` option placeholder from registry provider ids (preserves registry order). */
export function formatSourceCliPlaceholder(
  registryIds: readonly string[]
): string {
  if (registryIds.length === 0) {
    return "<all>";
  }
  return `<${[...registryIds, "all"].join("|")}>`;
}

/** CLI `--source` option description from registry provider ids. */
export function formatSourceCliDescription(
  registryIds: readonly string[]
): string {
  if (registryIds.length === 0) {
    return "Filter sessions by source (default: all)";
  }
  return `Filter sessions by source: ${registryIds.join(", ")}, or all (default: all)`;
}
