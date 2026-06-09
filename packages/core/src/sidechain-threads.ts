import type { TranscriptConversationMessage } from "./transcript-conversation.js";

export type SidechainThreadIndex = {
  /** Messages shown in the main timeline (not nested under a resolved parent). */
  topLevel: TranscriptConversationMessage[];
  /** Parent message `uuid` → sidechain child lines (sorted by lineNumber). */
  childrenByParentUuid: Map<string, TranscriptConversationMessage[]>;
};

/**
 * Groups sidechain JSONL lines under their parent `uuid`.
 * Lines with `parentUuid` pointing at a message in the same transcript are
 * removed from `topLevel` and listed in `childrenByParentUuid`.
 */
export function indexSidechainThreads(
  messages: TranscriptConversationMessage[]
): SidechainThreadIndex {
  const byUuid = new Map<string, TranscriptConversationMessage>();
  for (const m of messages) {
    if (m.uuid) {
      byUuid.set(m.uuid, m);
    }
  }

  const childrenByParentUuid = new Map<
    string,
    TranscriptConversationMessage[]
  >();

  for (const m of messages) {
    if (!m.isSidechain || !m.parentUuid) {
      continue;
    }
    if (!byUuid.has(m.parentUuid)) {
      continue;
    }
    const list = childrenByParentUuid.get(m.parentUuid) ?? [];
    list.push(m);
    childrenByParentUuid.set(m.parentUuid, list);
  }

  for (const list of childrenByParentUuid.values()) {
    list.sort((a, b) => a.lineNumber - b.lineNumber);
  }

  const nested = new Set<TranscriptConversationMessage>();
  for (const list of childrenByParentUuid.values()) {
    for (const c of list) {
      nested.add(c);
    }
  }

  const topLevel = messages
    .filter((m) => !nested.has(m))
    .sort((a, b) => a.lineNumber - b.lineNumber);

  return { topLevel, childrenByParentUuid };
}
