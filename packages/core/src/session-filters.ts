import path from "node:path";
import type { ProviderRegistry } from "./provider.js";
import type { Session, SessionFilter } from "./types.js";

function pathMatchesPrefix(p: string, prefix: string): boolean {
  return p === prefix || p.startsWith(prefix + path.sep);
}

export function uniqueWorkspacePaths(sessions: Session[]): string[] {
  const s = new Set<string>();
  for (const x of sessions) {
    for (const r of x.workspaceRoots) {
      s.add(r);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

export function filterSessions(
  sessions: Session[],
  f: SessionFilter,
  registry: ProviderRegistry
): Session[] {
  let out = sessions;
  if (f.source) {
    if (registry.get(f.source)) {
      out = out.filter((s) => s.source === f.source);
    } else {
      out = [];
    }
  }
  if (f.workspacePath) {
    const w = path.resolve(f.workspacePath);
    out = out.filter((s) =>
      s.workspaceRoots.some((r) => path.resolve(r) === w)
    );
  }
  if (f.workspacePrefix) {
    const prefix = path.resolve(f.workspacePrefix);
    out = out.filter((s) =>
      s.workspaceRoots.some((r) => pathMatchesPrefix(r, prefix))
    );
  }
  if (f.nameOrId) {
    const q = f.nameOrId.toLowerCase();
    out = out.filter(
      (s) =>
        s.sessionId.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q))
    );
  }
  if (f.createdBefore !== undefined) {
    out = out.filter((s) => s.createdAt < f.createdBefore!);
  }
  if (f.createdAfter !== undefined) {
    out = out.filter((s) => s.createdAt > f.createdAfter!);
  }
  if (f.updatedBefore !== undefined) {
    out = out.filter((s) => s.updatedAt < f.updatedBefore!);
  }
  if (f.updatedAfter !== undefined) {
    out = out.filter((s) => s.updatedAt > f.updatedAfter!);
  }
  if (f.metadataFilter && Object.keys(f.metadataFilter).length > 0) {
    for (const [key, value] of Object.entries(f.metadataFilter)) {
      if (value.trim() === "") {
        continue;
      }
      const expected = value.trim();
      out = out.filter((s) => s.metadata?.[key] === expected);
    }
  }
  return out;
}

export function findSessionById(
  sessions: Session[],
  sessionId: string
): Session | undefined {
  return sessions.find((s) => s.sessionId === sessionId);
}

/** When the same composer id appears in multiple workspace DB rows, keep the newest updatedAt. */
export function dedupeSessionsByNewestUpdated(
  sessions: Session[]
): Session[] {
  const m = new Map<string, Session>();
  for (const s of sessions) {
    const e = m.get(s.sessionId);
    if (
      !e ||
      s.updatedAt > e.updatedAt ||
      (s.updatedAt === e.updatedAt && s.createdAt > e.createdAt)
    ) {
      m.set(s.sessionId, s);
    }
  }
  return [...m.values()];
}
