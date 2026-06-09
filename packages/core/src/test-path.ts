/** Normalize a path to POSIX separators for cross-platform test assertions. */
export function asPosixPath(p: string): string {
  return p.replace(/\\/g, "/");
}
