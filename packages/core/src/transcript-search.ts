import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { listAllTranscriptJsonlFiles } from "./transcript-jsonl-index.js";
import type { ProviderRegistry } from "./provider.js";
import type { SessionSource } from "./types.js";

export type { TranscriptJsonlRef } from "./transcript-jsonl-index.js";
export { listAllTranscriptJsonlFiles } from "./transcript-jsonl-index.js";

export type TranscriptLineHit = {
  sessionId: string;
  lineNumber: number;
  preview: string;
  jsonlPath: string;
  workspacePath: string;
  workspaceLeaf: string;
  /** Top-level `role` from JSON when the line parses as an object; otherwise null. */
  role: string | null;
  /** Per-line timestamp from JSON when present (epoch ms); otherwise null. */
  messageAt: number | null;
  /** Session `updatedAt` used when `messageAt` is absent (epoch ms). */
  sessionUpdatedAt: number;
};

export type SearchTranscriptLinesOptions = {
  /** Max hits to return, newest first (see sort key below). */
  limit: number;
  registry: ProviderRegistry;
  /** When set, only scan JSONL for this source. */
  source?: SessionSource;
  /** When set, only scan JSONL files for these session IDs. */
  sessionIds?: ReadonlySet<string>;
  /**
   * When set, only lines whose JSON object has a string `role` matching
   * (trimmed, case-insensitive) are considered after the text needle matches.
   */
  role?: string;
  /**
   * Session id → updatedAt (epoch ms) for ordering hits without `messageAt`.
   * Missing ids sort as 0.
   */
  sessionUpdatedAt?: ReadonlyMap<string, number>;
};

const PREVIEW_MAX = 280;

const MESSAGE_TIME_KEYS = [
  "timestamp",
  "messageTime",
  "createdAt",
  "time",
] as const;

export function coerceTimestampMs(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return v < 1e12 ? Math.round(v * 1000) : Math.round(v);
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Date.parse(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function firstTimestampOnRecord(
  rec: Record<string, unknown>
): number | null {
  for (const key of MESSAGE_TIME_KEYS) {
    const t = coerceTimestampMs(rec[key]);
    if (t !== null) return t;
  }
  const msg = rec.message;
  if (msg && typeof msg === "object" && !Array.isArray(msg)) {
    return firstTimestampOnRecord(msg as Record<string, unknown>);
  }
  return null;
}

export type ParsedJsonlLine = {
  role: string | null;
  messageAt: number | null;
};

export function parseJsonlLine(line: string): ParsedJsonlLine | null {
  try {
    const o = JSON.parse(line) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      return null;
    }
    const rec = o as Record<string, unknown>;
    const r = rec.role;
    let role: string | null = typeof r === "string" ? r : null;
    if (!role) {
      const t = rec.type;
      if (
        t === "user" ||
        t === "assistant" ||
        t === "system"
      ) {
        role = t;
      }
    }
    return {
      role,
      messageAt: firstTimestampOnRecord(rec),
    };
  } catch {
    return null;
  }
}

export function extractJsonlLineRole(line: string): string | null {
  return parseJsonlLine(line)?.role ?? null;
}

export function extractJsonlLineMessageTime(line: string): number | null {
  return parseJsonlLine(line)?.messageAt ?? null;
}

export function hitSortKey(hit: TranscriptLineHit): number {
  return hit.messageAt ?? hit.sessionUpdatedAt ?? 0;
}

export function compareTranscriptHitsNewestFirst(
  a: TranscriptLineHit,
  b: TranscriptLineHit
): number {
  const d = hitSortKey(b) - hitSortKey(a);
  if (d !== 0) return d;
  if (a.sessionId !== b.sessionId) {
    return a.sessionId.localeCompare(b.sessionId);
  }
  return b.lineNumber - a.lineNumber;
}

function retainNewestHits(
  hits: TranscriptLineHit[],
  candidate: TranscriptLineHit,
  limit: number
): void {
  if (hits.length < limit) {
    hits.push(candidate);
    if (hits.length === limit) {
      hits.sort(compareTranscriptHitsNewestFirst);
    }
    return;
  }
  const worst = hits[limit - 1]!;
  if (compareTranscriptHitsNewestFirst(candidate, worst) >= 0) {
    return;
  }
  hits.push(candidate);
  hits.sort(compareTranscriptHitsNewestFirst);
  hits.length = limit;
}

function normalizePreview(line: string): string {
  const one = line.replace(/\r$/, "").replace(/\s+/g, " ").trim();
  if (one.length <= PREVIEW_MAX) return one;
  return one.slice(0, PREVIEW_MAX) + "…";
}

async function scanFileForNeedle(
  jsonlPath: string,
  needleLower: string,
  roleFilterLower: string | undefined,
  sessionUpdatedAt: number,
  meta: Pick<
    TranscriptLineHit,
    "sessionId" | "jsonlPath" | "workspacePath" | "workspaceLeaf"
  >,
  onHit: (hit: TranscriptLineHit) => void
): Promise<void> {
  const input = createReadStream(jsonlPath, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  try {
    for await (const line of rl) {
      lineNumber++;
      if (typeof line !== "string") continue;
      if (!line.toLowerCase().includes(needleLower)) continue;
      const parsed = parseJsonlLine(line);
      const role = parsed?.role ?? null;
      if (roleFilterLower !== undefined) {
        if (!role || role.trim().toLowerCase() !== roleFilterLower) {
          continue;
        }
      }
      onHit({
        ...meta,
        lineNumber,
        preview: normalizePreview(line),
        role,
        messageAt: parsed?.messageAt ?? null,
        sessionUpdatedAt,
      });
    }
  } finally {
    rl.close();
  }
}

/**
 * Case-insensitive substring search over agent JSONL transcript lines
 * (`~/.cursor/projects/.../agent-transcripts/<uuid>/<uuid>.jsonl`).
 * When `options.role` is set, only lines whose JSON object has a matching
 * string `role` (trimmed, case-insensitive) are considered after the needle matches.
 */
export async function searchTranscriptLines(
  needle: string,
  options: SearchTranscriptLinesOptions
): Promise<TranscriptLineHit[]> {
  const n = needle.trim();
  if (!n) {
    return [];
  }
  const needleLower = n.toLowerCase();
  const roleTrim = options.role?.trim();
  const roleFilterLower =
    roleTrim && roleTrim.length > 0 ? roleTrim.toLowerCase() : undefined;
  const limit = Math.max(1, Math.min(options.limit || 200, 5000));
  const allow = options.sessionIds;
  const sourceFilter = options.source;

  const files = listAllTranscriptJsonlFiles(options.registry).filter((f) => {
    if (sourceFilter && f.source !== sourceFilter) {
      return false;
    }
    if (allow && !allow.has(f.sessionId)) {
      return false;
    }
    return true;
  });

  const sessionUpdatedAt = options.sessionUpdatedAt;
  const hits: TranscriptLineHit[] = [];

  for (const f of files) {
    const updatedAt = sessionUpdatedAt?.get(f.sessionId) ?? 0;
    await scanFileForNeedle(
      f.jsonlPath,
      needleLower,
      roleFilterLower,
      updatedAt,
      {
        sessionId: f.sessionId,
        jsonlPath: f.jsonlPath,
        workspacePath: f.workspacePath,
        workspaceLeaf: f.workspaceLeaf,
      },
      (h) => {
        retainNewestHits(hits, h, limit);
      }
    );
  }

  hits.sort(compareTranscriptHitsNewestFirst);
  return hits;
}
