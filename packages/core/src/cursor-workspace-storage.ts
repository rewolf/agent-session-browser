import Database from "better-sqlite3";
import { readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { parseComposerSessions } from "./composer.js";
import { readWorkspaceJsonRoots } from "./paths.js";
import type { Session, SessionSource } from "./types.js";

function listWorkspaceStorageDirs(userDir: string): string[] {
  const base = path.join(userDir, "workspaceStorage");
  if (!existsSync(base)) {
    return [];
  }
  try {
    return readdirSync(base).map((id) => path.join(base, id));
  } catch {
    return [];
  }
}

function readComposerDataRow(dbPath: string): string | null {
  if (!existsSync(dbPath)) {
    return null;
  }
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const row = db
        .prepare("SELECT value FROM ItemTable WHERE key = ? LIMIT 1")
        .get("composer.composerData") as { value: Buffer | string } | undefined;
      if (!row) return null;
      const v = row.value;
      if (Buffer.isBuffer(v)) {
        return v.toString("utf8");
      }
      if (typeof v === "string") {
        return v;
      }
      return null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

function safeStat(p: string) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

/** Scan Cursor workspaceStorage SQLite rows for composer sessions. */
export function scanCursorComposerDbSessions(
  userDir: string,
  sourceId: SessionSource
): Session[] {
  const sessions: Session[] = [];
  for (const dir of listWorkspaceStorageDirs(userDir)) {
    const stat = safeStat(dir);
    if (!stat?.isDirectory()) continue;
    const wid = path.basename(dir);
    const wj = path.join(dir, "workspace.json");
    if (!existsSync(wj)) continue;
    const wr = readWorkspaceJsonRoots(wj, wid);
    if (!wr || wr.roots.length === 0) continue;
    const dbPath = path.join(dir, "state.vscdb");
    const jsonStr = readComposerDataRow(dbPath);
    const heads = parseComposerSessions(jsonStr);
    const roots = wr.roots.map((r) => path.normalize(r));
    const primary = roots[0]!;
    const leaf = path.basename(primary);
    for (const h of heads) {
      const cid = h.composerId!;
      const createdAt = typeof h.createdAt === "number" ? h.createdAt : 0;
      const updatedAt =
        typeof h.lastUpdatedAt === "number"
          ? h.lastUpdatedAt
          : createdAt;
      sessions.push({
        sessionId: cid,
        name: typeof h.name === "string" ? h.name : undefined,
        workspacePath: primary,
        workspaceLeaf: leaf,
        workspaceRoots: roots,
        createdAt,
        updatedAt,
        source: sourceId,
      });
    }
  }
  return sessions;
}
