import { createReadStream, readFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { stripUserQueryTags } from "./user-query-text.js";

const TITLE_MAX = 80;
const titleCache = new Map<string, { mtimeMs: number; title: string }>();

function truncateSingleLine(text: string, max: number): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  return one.slice(0, max) + "…";
}

function firstUserTextFromRecord(rec: Record<string, unknown>): string | null {
  const role =
    typeof rec.role === "string"
      ? rec.role
      : typeof rec.type === "string" &&
          (rec.type === "user" ||
            rec.type === "assistant" ||
            rec.type === "system")
        ? rec.type
        : null;
  if (role !== "user") {
    return null;
  }
  const msg = rec.message;
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
    return null;
  }
  const content = (msg as Record<string, unknown>).content;
  if (!Array.isArray(content)) {
    return null;
  }
  for (const item of content) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const o = item as Record<string, unknown>;
    if (o.type === "text" && typeof o.text === "string") {
      const text = stripUserQueryTags(o.text);
      if (text) {
        return text;
      }
    }
  }
  return null;
}

function titleFromLines(lines: Iterable<string>): string | undefined {
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }
    try {
      const o = JSON.parse(line) as unknown;
      if (!o || typeof o !== "object" || Array.isArray(o)) {
        continue;
      }
      const text = firstUserTextFromRecord(o as Record<string, unknown>);
      if (text) {
        return truncateSingleLine(text, TITLE_MAX);
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

/**
 * Read JSONL until the first user message with non-empty text; return a
 * single-line preview (≤80 chars). Cached by path + mtime.
 */
export function deriveSessionTitleFromJsonl(jsonlPath: string): string | undefined {
  let mtimeMs = 0;
  try {
    mtimeMs = statSync(jsonlPath).mtimeMs;
  } catch {
    return undefined;
  }
  const cached = titleCache.get(jsonlPath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.title;
  }

  let raw: string;
  try {
    raw = readFileSync(jsonlPath, "utf8");
  } catch {
    return undefined;
  }
  const title = titleFromLines(raw.split(/\r?\n/));
  if (title) {
    titleCache.set(jsonlPath, { mtimeMs, title });
  }
  return title;
}

/** Stream-read variant for callers that prefer not to load whole files. */
export async function deriveSessionTitleFromJsonlAsync(
  jsonlPath: string
): Promise<string | undefined> {
  const sync = deriveSessionTitleFromJsonl(jsonlPath);
  if (sync) {
    return sync;
  }
  let mtimeMs = 0;
  try {
    mtimeMs = statSync(jsonlPath).mtimeMs;
  } catch {
    return undefined;
  }
  const input = createReadStream(jsonlPath, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });
  const lines: string[] = [];
  try {
    for await (const line of rl) {
      lines.push(line);
    }
  } finally {
    rl.close();
  }
  const title = titleFromLines(lines);
  if (title) {
    titleCache.set(jsonlPath, { mtimeMs, title });
  }
  return title;
}

/** @internal test helper */
export function clearSessionTitleCache(): void {
  titleCache.clear();
}
