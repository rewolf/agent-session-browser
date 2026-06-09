import { existsSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Map a hyphen-separated directory name (Cursor slug or Claude project hash)
 * back to a filesystem path by partitioning tokens into segments such that
 * each prefix path exists as a directory.
 */
export function hashedDirToWorkspacePath(
  slug: string,
  existsDir: (abs: string) => boolean = (p) => {
    try {
      return existsSync(p) && statSync(p).isDirectory();
    } catch {
      return false;
    }
  }
): string | null {
  const tokens = slug.split("-").filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return null;
  }
  const solutions: string[] = [];
  function dfs(from: number, segments: string[]): void {
    if (from === tokens.length) {
      const p = path.resolve("/" + segments.join("/"));
      if (existsDir(p)) {
        solutions.push(p);
      }
      return;
    }
    for (let to = from + 1; to <= tokens.length; to++) {
      const seg = tokens.slice(from, to).join("-");
      const partial = path.resolve("/" + [...segments, seg].join("/"));
      if (existsDir(partial)) {
        dfs(to, [...segments, seg]);
      }
    }
  }
  dfs(0, []);
  if (solutions.length === 0) {
    return null;
  }
  solutions.sort((a, b) => b.length - a.length);
  return solutions[0]!;
}
