import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { hashedDirToWorkspacePath } from "./hashed-dir-path.js";
import {
  defaultClaudeProjectsDir,
  resolveClaudeProjectsDir,
} from "./paths.js";
import type { SessionProvider, TranscriptFileRef } from "./provider.js";
import { dedupeSessionsByNewestUpdated } from "./session-filters.js";
import { deriveSessionTitleFromJsonl } from "./session-title.js";
import type { Session } from "./types.js";
import { shellQuoteToken } from "./resume-command.js";
import { parseJsonlLine } from "./transcript-search.js";
import { loadSessionConversation } from "./transcript-conversation.js";

export { defaultClaudeProjectsDir, resolveClaudeProjectsDir };

/** Same encoding as Cursor slugs: `/` in paths becomes `-` in the hash dir name. */
export function hashedPathToWorkspacePath(
  hash: string,
  existsDir?: (abs: string) => boolean
): string | null {
  return hashedDirToWorkspacePath(hash, existsDir);
}

export type ClaudeTranscriptFile = Omit<TranscriptFileRef, "source">;

const UUID_RE = /^[0-9a-f-]{36}$/i;

function listClaudeTranscriptFiles(
  projectsDir = resolveClaudeProjectsDir()
): ClaudeTranscriptFile[] {
  if (!existsSync(projectsDir)) {
    return [];
  }
  const out: ClaudeTranscriptFile[] = [];
  let hashNames: string[];
  try {
    hashNames = readdirSync(projectsDir);
  } catch {
    return [];
  }
  for (const hash of hashNames) {
    if (hash.startsWith(".") || hash === "node_modules") {
      continue;
    }
    const hashDir = path.join(projectsDir, hash);
    let st;
    try {
      st = statSync(hashDir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) {
      continue;
    }
    const workspacePathResolved = hashedPathToWorkspacePath(hash);
    const primary = workspacePathResolved ?? hashDir;
    const leaf = path.basename(primary);
    let entries: string[];
    try {
      entries = readdirSync(hashDir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith(".jsonl")) {
        continue;
      }
      const sessionId = name.slice(0, -".jsonl".length);
      if (!UUID_RE.test(sessionId)) {
        continue;
      }
      const jsonlPath = path.join(hashDir, name);
      try {
        if (!statSync(jsonlPath).isFile()) {
          continue;
        }
      } catch {
        continue;
      }
      out.push({
        sessionId,
        jsonlPath,
        workspacePath: primary,
        workspaceLeaf: leaf,
      });
    }
  }
  return out;
}

function findClaudeTranscriptFile(
  sessionId: string,
  projectsDir = resolveClaudeProjectsDir()
): ClaudeTranscriptFile | null {
  return (
    listClaudeTranscriptFiles(projectsDir).find(
      (f) => f.sessionId === sessionId
    ) ?? null
  );
}

type JsonlTimeBounds = {
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
};

function readHeadTailLines(
  jsonlPath: string,
  maxLinesEach = 40
): { head: string[]; tail: string[] } {
  let raw: string;
  try {
    raw = readFileSync(jsonlPath, "utf8");
  } catch {
    return { head: [], tail: [] };
  }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length <= maxLinesEach * 2) {
    return { head: lines, tail: [] };
  }
  return {
    head: lines.slice(0, maxLinesEach),
    tail: lines.slice(-maxLinesEach),
  };
}

function applyMetadataFromLine(
  line: string,
  metadata: Record<string, string>
): void {
  let rec: Record<string, unknown>;
  try {
    const o = JSON.parse(line) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      return;
    }
    rec = o as Record<string, unknown>;
  } catch {
    return;
  }
  if (rec.isSidechain === true) {
    metadata.hasSidechains = "true";
  }
  const branch =
    typeof rec.gitBranch === "string"
      ? rec.gitBranch
      : typeof rec.branch === "string"
        ? rec.branch
        : undefined;
  if (branch) {
    metadata.gitBranch = branch;
  }
  const version = typeof rec.version === "string" ? rec.version : undefined;
  if (version) {
    metadata.cliVersion = version;
  }
  const eventType = typeof rec.type === "string" ? rec.type : undefined;
  if (eventType === "permission-mode") {
    const mode =
      typeof rec.mode === "string"
        ? rec.mode
        : typeof rec.permissionMode === "string"
          ? rec.permissionMode
          : undefined;
    if (mode) {
      metadata.permissionMode = mode;
    }
  }
}

function mergeMetadata(
  target: Record<string, string>,
  source: Record<string, string>
): void {
  for (const [key, value] of Object.entries(source)) {
    if (value) {
      target[key] = value;
    }
  }
}

function boundsFromLines(lines: string[]): JsonlTimeBounds | null {
  let createdAt: number | null = null;
  let updatedAt: number | null = null;
  const metadata: Record<string, string> = {};
  for (const line of lines) {
    applyMetadataFromLine(line, metadata);
    const parsed = parseJsonlLine(line);
    const t = parsed?.messageAt;
    if (t == null) {
      continue;
    }
    if (createdAt == null || t < createdAt) {
      createdAt = t;
    }
    if (updatedAt == null || t > updatedAt) {
      updatedAt = t;
    }
  }
  if (createdAt == null && updatedAt == null) {
    return Object.keys(metadata).length > 0
      ? { createdAt: 0, updatedAt: 0, metadata }
      : null;
  }
  const c = createdAt ?? updatedAt ?? 0;
  const u = updatedAt ?? createdAt ?? c;
  return { createdAt: c, updatedAt: u, metadata };
}

function inferJsonlTimeBounds(jsonlPath: string): JsonlTimeBounds | null {
  const { head, tail } = readHeadTailLines(jsonlPath);
  const fromHead = boundsFromLines(head);
  const fromTail = tail.length > 0 ? boundsFromLines(tail) : null;
  if (!fromHead && !fromTail) {
    return null;
  }
  const metadata: Record<string, string> = {};
  if (fromHead) {
    mergeMetadata(metadata, fromHead.metadata);
  }
  if (fromTail) {
    mergeMetadata(metadata, fromTail.metadata);
    if (fromTail.metadata.hasSidechains === "true") {
      metadata.hasSidechains = "true";
    }
    if (fromTail.metadata.gitBranch) {
      metadata.gitBranch = fromTail.metadata.gitBranch;
    }
    if (fromTail.metadata.cliVersion) {
      metadata.cliVersion = fromTail.metadata.cliVersion;
    }
    if (fromTail.metadata.permissionMode) {
      metadata.permissionMode = fromTail.metadata.permissionMode;
    }
  }
  const createdAt = Math.min(
    fromHead?.createdAt ?? Number.POSITIVE_INFINITY,
    fromTail?.createdAt ?? Number.POSITIVE_INFINITY
  );
  const updatedAt = Math.max(
    fromHead?.updatedAt ?? 0,
    fromTail?.updatedAt ?? 0
  );
  if (!Number.isFinite(createdAt)) {
    return {
      createdAt: updatedAt,
      updatedAt,
      metadata,
    };
  }
  return {
    createdAt: createdAt === Number.POSITIVE_INFINITY ? updatedAt : createdAt,
    updatedAt,
    metadata,
  };
}

export function scanClaudeSessions(
  projectsDir = resolveClaudeProjectsDir()
): Session[] {
  const out: Session[] = [];
  for (const f of listClaudeTranscriptFiles(projectsDir)) {
    let st;
    try {
      st = statSync(f.jsonlPath);
    } catch {
      continue;
    }
    const fileCreated = st.birthtimeMs > 0 ? st.birthtimeMs : st.ctimeMs;
    const fileUpdated = st.mtimeMs;
    const bounds = inferJsonlTimeBounds(f.jsonlPath);
    const createdAt =
      bounds && bounds.createdAt > 0 ? bounds.createdAt : fileCreated;
    const updatedAt =
      bounds && bounds.updatedAt > 0 ? bounds.updatedAt : fileUpdated;
    const name = deriveSessionTitleFromJsonl(f.jsonlPath);
    const session: Session = {
      sessionId: f.sessionId,
      name,
      workspacePath: f.workspacePath,
      workspaceLeaf: f.workspaceLeaf,
      workspaceRoots: [f.workspacePath],
      createdAt,
      updatedAt,
      source: "claude",
    };
    if (bounds && Object.keys(bounds.metadata).length > 0) {
      session.metadata = bounds.metadata;
    }
    out.push(session);
  }
  return out;
}

export class ClaudeSessionProvider implements SessionProvider {
  readonly id = "claude" as const;
  readonly displayName = "Claude Code";
  readonly badgeColor = "#e8c47a";
  readonly resumeCommandName = "claude";
  readonly workspaceGrouping = "fs-path" as const;

  constructor(private readonly projectsDir: string) {}

  async scanSessions() {
    return {
      sessions: dedupeSessionsByNewestUpdated(
        scanClaudeSessions(this.projectsDir)
      ),
    };
  }

  async healthCheck() {
    return { ok: true as const };
  }

  findTranscriptFile(sessionId: string): TranscriptFileRef | null {
    const file = findClaudeTranscriptFile(sessionId, this.projectsDir);
    if (!file) {
      return null;
    }
    return { ...file, source: this.id };
  }

  listTranscriptFiles(): TranscriptFileRef[] {
    return listClaudeTranscriptFiles(this.projectsDir).map((f) => ({
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
    return `claude --resume ${id}`;
  }

  metadataKeys() {
    return [
      { key: "gitBranch", label: "Git branch", kind: "text" as const },
      { key: "cliVersion", label: "CLI version", kind: "text" as const },
      {
        key: "permissionMode",
        label: "Permission mode",
        kind: "text" as const,
      },
      {
        key: "hasSidechains",
        label: "Has subagents",
        kind: "boolean" as const,
      },
    ];
  }
}
