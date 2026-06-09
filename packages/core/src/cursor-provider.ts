import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { hashedDirToWorkspacePath } from "./hashed-dir-path.js";
import type { SessionProvider, TranscriptFileRef } from "./provider.js";
import { loadSessionConversation } from "./transcript-conversation.js";
import { scanCursorComposerDbSessions } from "./cursor-workspace-storage.js";
import { dedupeSessionsByNewestUpdated } from "./session-filters.js";
import type { Session } from "./types.js";
import { shellQuoteToken } from "./resume-command.js";

/** Default ~/.cursor/projects (agent JSONL transcripts live under each slug's agent-transcripts folder). */
export function defaultCursorProjectsDir(): string {
  return path.join(homedir(), ".cursor", "projects");
}

export function resolveCursorProjectsDir(): string {
  const fromEnv = process.env.ASB_CURSOR_PROJECTS_DIR;
  if (fromEnv && fromEnv.length > 0) {
    return path.resolve(fromEnv);
  }
  return path.resolve(defaultCursorProjectsDir());
}

/**
 * Map a Cursor project slug (hyphen-separated) back to a filesystem path by
 * partitioning tokens into segments such that each prefix path exists as a directory.
 * Handles hyphens inside a segment (e.g. my-app) when a shorter prefix is not a directory.
 */
export function slugToWorkspacePath(
  slug: string,
  existsDir?: (abs: string) => boolean
): string | null {
  return hashedDirToWorkspacePath(slug, existsDir);
}

export type CursorTranscriptFile = Omit<TranscriptFileRef, "source">;

function listCursorTranscriptFiles(
  projectsDir = resolveCursorProjectsDir()
): CursorTranscriptFile[] {
  if (!existsSync(projectsDir)) {
    return [];
  }
  const out: CursorTranscriptFile[] = [];
  let slugNames: string[];
  try {
    slugNames = readdirSync(projectsDir);
  } catch {
    return [];
  }
  for (const slug of slugNames) {
    if (slug.startsWith(".") || slug === "node_modules") {
      continue;
    }
    const transcriptsRoot = path.join(projectsDir, slug, "agent-transcripts");
    if (!existsSync(transcriptsRoot)) {
      continue;
    }
    const workspacePathResolved = slugToWorkspacePath(slug);
    const primary = workspacePathResolved ?? path.join(projectsDir, slug);
    const leaf = path.basename(primary);
    let sessionIds: string[];
    try {
      sessionIds = readdirSync(transcriptsRoot);
    } catch {
      continue;
    }
    for (const sessionId of sessionIds) {
      if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
        continue;
      }
      const dir = path.join(transcriptsRoot, sessionId);
      const jsonl = path.join(dir, `${sessionId}.jsonl`);
      if (!existsSync(jsonl)) {
        continue;
      }
      out.push({
        sessionId,
        jsonlPath: jsonl,
        workspacePath: primary,
        workspaceLeaf: leaf,
      });
    }
  }
  return out;
}

function findCursorTranscriptFile(
  sessionId: string,
  projectsDir = resolveCursorProjectsDir()
): CursorTranscriptFile | null {
  return (
    listCursorTranscriptFiles(projectsDir).find(
      (f) => f.sessionId === sessionId
    ) ?? null
  );
}

export function scanCursorTranscriptSessions(
  projectsDir = resolveCursorProjectsDir()
): Session[] {
  const out: Session[] = [];
  for (const f of listCursorTranscriptFiles(projectsDir)) {
    let st;
    try {
      st = statSync(f.jsonlPath);
    } catch {
      continue;
    }
    const updatedAt = st.mtimeMs;
    const createdAt = st.birthtimeMs > 0 ? st.birthtimeMs : st.ctimeMs;
    out.push({
      sessionId: f.sessionId,
      workspacePath: f.workspacePath,
      workspaceLeaf: f.workspaceLeaf,
      workspaceRoots: [f.workspacePath],
      createdAt,
      updatedAt,
      source: "cursor",
    });
  }
  return out;
}

export function mergeCursorDbAndTranscriptSessions(
  fromComposerDb: Session[],
  fromTranscripts: Session[]
): Session[] {
  const byId = new Map<string, Session>();
  for (const s of fromComposerDb) {
    byId.set(s.sessionId, { ...s, source: "cursor" as const });
  }
  for (const t of fromTranscripts) {
    const e = byId.get(t.sessionId);
    if (e) {
      e.updatedAt = Math.max(e.updatedAt, t.updatedAt);
      e.createdAt = Math.min(e.createdAt, t.createdAt);
    } else {
      byId.set(t.sessionId, { ...t, source: "cursor" as const });
    }
  }
  return [...byId.values()];
}

export class CursorSessionProvider implements SessionProvider {
  readonly id = "cursor" as const;
  readonly displayName = "Cursor";
  readonly badgeColor = "#7ec8ff";
  readonly resumeCommandName = "agent";
  readonly workspaceGrouping = "fs-path" as const;

  constructor(
    private readonly userDir: string,
    private readonly projectsDir: string
  ) {}

  async scanSessions() {
    const fromDb = dedupeSessionsByNewestUpdated(
      scanCursorComposerDbSessions(this.userDir, this.id)
    );
    return {
      sessions: mergeCursorDbAndTranscriptSessions(
        fromDb,
        scanCursorTranscriptSessions(this.projectsDir)
      ),
    };
  }

  async healthCheck() {
    return { ok: true as const };
  }

  findTranscriptFile(sessionId: string): TranscriptFileRef | null {
    const file = findCursorTranscriptFile(sessionId, this.projectsDir);
    if (!file) {
      return null;
    }
    return { ...file, source: this.id };
  }

  listTranscriptFiles(): TranscriptFileRef[] {
    return listCursorTranscriptFiles(this.projectsDir).map((f) => ({
      ...f,
      source: this.id,
    }));
  }

  async loadConversation(
    sessionId: string,
    file?: TranscriptFileRef | null
  ): Promise<import("./transcript-conversation.js").TranscriptConversation | null> {
    const ref = file ?? this.findTranscriptFile(sessionId);
    if (!ref) {
      return null;
    }
    return loadSessionConversation(ref);
  }

  formatResumeCommandTail(session: Session): string {
    const id = shellQuoteToken(session.sessionId);
    return `agent --resume=${id}`;
  }

  metadataKeys() {
    return [];
  }
}
