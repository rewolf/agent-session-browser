/** Returns true when `url` is an absolute http(s) URL safe for use in `<a href>`. */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.toLowerCase();
    return scheme === "http:" || scheme === "https:";
  } catch {
    return false;
  }
}
