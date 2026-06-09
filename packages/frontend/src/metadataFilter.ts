const METADATA_URL_PREFIX = "metadata.";

export function parseMetadataFromSearch(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search)) {
    if (!key.startsWith(METADATA_URL_PREFIX)) {
      continue;
    }
    const metaKey = key.slice(METADATA_URL_PREFIX.length);
    if (!metaKey || !value.trim()) {
      continue;
    }
    out[metaKey] = value.trim();
  }
  return out;
}

export function writeMetadataFilterToUrl(
  metadata: Record<string, string>
): void {
  const url = new URL(window.location.href);
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith(METADATA_URL_PREFIX)) {
      url.searchParams.delete(key);
    }
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (value.trim()) {
      url.searchParams.set(`${METADATA_URL_PREFIX}${key}`, value.trim());
    }
  }
  window.history.replaceState({}, "", url.toString());
}

export function clearMetadataKeysFromUrl(keys: readonly string[]): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of keys) {
    const param = `${METADATA_URL_PREFIX}${key}`;
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState({}, "", url.toString());
  }
}
