import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { closeReadlineStream } from "./readline-stream.js";
import type { ProviderRegistry, TranscriptFileRef } from "./provider.js";
import type { SessionSource } from "./types.js";
import { parseJsonlLine } from "./transcript-search.js";
import { stripUserQueryTags } from "./user-query-text.js";

export { stripUserQueryTags } from "./user-query-text.js";

export type TranscriptTextBlock = {
  type: "text";
  text: string;
};

export type TranscriptToolUseBlock = {
  type: "tool_use";
  name: string;
  detail: string;
};

export type TranscriptToolResultBlock = {
  type: "tool_result";
  detail: string;
};

export type TranscriptThinkingBlock = {
  type: "thinking";
  thinking: string;
};

export type TranscriptOtherBlock = {
  type: "other";
  label: string;
  detail: string;
};

export type TranscriptContentBlock =
  | TranscriptTextBlock
  | TranscriptThinkingBlock
  | TranscriptToolUseBlock
  | TranscriptToolResultBlock
  | TranscriptOtherBlock;

export type TranscriptConversationMessage = {
  lineNumber: number;
  role: string | null;
  messageAt: number | null;
  blocks: TranscriptContentBlock[];
  /** Claude JSONL line id when present. */
  uuid?: string;
  /** Links a sidechain line to a parent message's `uuid`. */
  parentUuid?: string;
  /** True when this line is a Claude subagent / sidechain turn. */
  isSidechain?: boolean;
};

export type TranscriptConversation = {
  sessionId: string;
  jsonlPath: string;
  workspacePath: string;
  workspaceLeaf: string;
  messages: TranscriptConversationMessage[];
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

function compactJson(value: unknown): string {
  try {
    return truncate(JSON.stringify(value), 1200);
  } catch {
    return String(value);
  }
}

function extractSidechainFields(
  rec: Record<string, unknown>
): Pick<
  TranscriptConversationMessage,
  "uuid" | "parentUuid" | "isSidechain"
> {
  const out: Pick<
    TranscriptConversationMessage,
    "uuid" | "parentUuid" | "isSidechain"
  > = {};
  if (typeof rec.uuid === "string" && rec.uuid.trim()) {
    out.uuid = rec.uuid.trim();
  }
  if (typeof rec.parentUuid === "string" && rec.parentUuid.trim()) {
    out.parentUuid = rec.parentUuid.trim();
  }
  if (rec.isSidechain === true) {
    out.isSidechain = true;
  }
  return out;
}

function extractContentBlocks(
  rec: Record<string, unknown>
): TranscriptContentBlock[] {
  const msg = rec.message;
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
    return [];
  }
  const content = (msg as Record<string, unknown>).content;
  if (typeof content === "string") {
    const text = stripUserQueryTags(content);
    return text ? [{ type: "text", text }] : [];
  }
  if (!Array.isArray(content)) {
    return [];
  }
  const blocks: TranscriptContentBlock[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const kind = typeof o.type === "string" ? o.type : "unknown";
    if (kind === "text" && typeof o.text === "string") {
      const text = stripUserQueryTags(o.text);
      if (text) {
        blocks.push({ type: "text", text });
      }
    } else if (kind === "thinking" && typeof o.thinking === "string") {
      const thinking = o.thinking.trim();
      if (thinking) {
        blocks.push({ type: "thinking", thinking });
      }
    } else if (kind === "tool_use") {
      const name = typeof o.name === "string" ? o.name : "tool";
      blocks.push({
        type: "tool_use",
        name,
        detail: compactJson(o.input ?? o),
      });
    } else if (kind === "tool_result") {
      blocks.push({
        type: "tool_result",
        detail: compactJson(o.content ?? o.output ?? o),
      });
    } else {
      blocks.push({
        type: "other",
        label: kind,
        detail: compactJson(o),
      });
    }
  }
  return blocks;
}

export function parseJsonlConversationLine(
  line: string,
  lineNumber: number
): TranscriptConversationMessage | null {
  const parsed = parseJsonlLine(line);
  if (!parsed) {
    return {
      lineNumber,
      role: null,
      messageAt: null,
      blocks: [{ type: "text", text: line.trim() }],
    };
  }
  try {
    const o = JSON.parse(line) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      return null;
    }
    const rec = o as Record<string, unknown>;
    const blocks = extractContentBlocks(rec);
    const sidechain = extractSidechainFields(rec);
    return {
      lineNumber,
      role: parsed.role,
      messageAt: parsed.messageAt,
      ...sidechain,
      blocks:
        blocks.length > 0
          ? blocks
          : [{ type: "text", text: truncate(line.trim(), 2000) }],
    };
  } catch {
    return {
      lineNumber,
      role: parsed.role,
      messageAt: parsed.messageAt,
      blocks: [{ type: "text", text: line.trim() }],
    };
  }
}

function resolveTranscriptFile(
  sessionId: string,
  source: SessionSource,
  registry: ProviderRegistry
): TranscriptFileRef | null {
  const provider = registry.get(source);
  if (!provider) {
    throw new Error(`Unknown session source: ${String(source)}`);
  }
  return provider.findTranscriptFile(sessionId);
}

export async function loadSessionConversation(
  file: TranscriptFileRef
): Promise<TranscriptConversation | null> {
  const messages: TranscriptConversationMessage[] = [];
  const input = createReadStream(file.jsonlPath, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  try {
    for await (const line of rl) {
      lineNumber++;
      if (typeof line !== "string" || line.trim() === "") {
        continue;
      }
      const msg = parseJsonlConversationLine(line, lineNumber);
      if (msg) {
        messages.push(msg);
      }
    }
  } finally {
    await closeReadlineStream(rl, input);
  }

  return {
    sessionId: file.sessionId,
    jsonlPath: file.jsonlPath,
    workspacePath: file.workspacePath,
    workspaceLeaf: file.workspaceLeaf,
    messages,
  };
}

export async function loadSessionConversationBySource(
  sessionId: string,
  source: SessionSource,
  registry: ProviderRegistry
): Promise<TranscriptConversation | null> {
  const file = resolveTranscriptFile(sessionId, source, registry);
  if (!file) {
    return null;
  }
  return loadSessionConversation(file);
}
