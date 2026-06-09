/** Parse CLI date: epoch ms number or ISO 8601 string. */
export function parseCliDate(raw: string): number {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid epoch: "${raw}"`);
    }
    return n;
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid date: "${raw}" (use ISO-8601 or epoch ms)`);
  }
  return ms;
}
