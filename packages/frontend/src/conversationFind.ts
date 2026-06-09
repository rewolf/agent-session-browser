import { blocksForDisplay } from "./conversationDialogFilters";
import { blockCopyText } from "./messageContent";
import type { SidechainThreadIndex } from "./sidechainThreads";
import type { DialogItem } from "./conversationDialogFilters";
import type { TranscriptContentBlock, TranscriptConversationMessage } from "./types";

export type ConversationFindMatch = {
  globalIndex: number;
  lineNumber: number;
  /** Parent turn uuid when the match is in a sidechain child. */
  parentUuid?: string;
  blockIndex: number;
  start: number;
  end: number;
};

/** Case-insensitive non-overlapping substring matches in `text`. */
export function findCaseInsensitiveMatches(
  text: string,
  query: string
): Array<{ start: number; end: number }> {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: Array<{ start: number; end: number }> = [];
  let pos = 0;
  while (pos < lower.length) {
    const idx = lower.indexOf(needle, pos);
    if (idx === -1) {
      break;
    }
    out.push({ start: idx, end: idx + needle.length });
    pos = idx + needle.length;
  }
  return out;
}

function collectMatchesInMessage(
  message: TranscriptConversationMessage,
  query: string,
  parentUuid: string | undefined,
  nextGlobalIndex: number
): { matches: ConversationFindMatch[]; nextGlobalIndex: number } {
  const matches: ConversationFindMatch[] = [];
  let globalIndex = nextGlobalIndex;
  message.blocks.forEach((block, blockIndex) => {
    const text = blockCopyText(block);
    for (const { start, end } of findCaseInsensitiveMatches(text, query)) {
      matches.push({
        globalIndex,
        lineNumber: message.lineNumber,
        parentUuid,
        blockIndex,
        start,
        end,
      });
      globalIndex += 1;
    }
  });
  return { matches, nextGlobalIndex: globalIndex };
}

function sidechainChildrenInDisplayOrder(
  parentUuid: string,
  threadIndex: SidechainThreadIndex
): TranscriptConversationMessage[] {
  return threadIndex.childrenByParentUuid.get(parentUuid) ?? [];
}

export function collectConversationFindMatches(
  dialogItems: DialogItem[],
  threadIndex: SidechainThreadIndex,
  showToolUsages: boolean,
  showRedacted: boolean,
  query: string
): ConversationFindMatch[] {
  const q = query.trim();
  if (!q) {
    return [];
  }

  const all: ConversationFindMatch[] = [];
  let nextGlobalIndex = 0;

  for (const item of dialogItems) {
    if (item.kind !== "message") {
      continue;
    }
    const { message } = item;
    const { matches, nextGlobalIndex: afterParent } = collectMatchesInMessage(
      message,
      q,
      undefined,
      nextGlobalIndex
    );
    all.push(...matches);
    nextGlobalIndex = afterParent;

    if (!message.uuid) {
      continue;
    }
    const children = sidechainChildrenInDisplayOrder(message.uuid, threadIndex);
    for (const child of children) {
      const blocks = blocksForDisplay(
        child.blocks,
        showToolUsages,
        showRedacted
      );
      if (blocks.length === 0) {
        continue;
      }
      const { matches: childMatches, nextGlobalIndex: afterChild } =
        collectMatchesInMessage(
          { ...child, blocks },
          q,
          message.uuid,
          nextGlobalIndex
        );
      all.push(...childMatches);
      nextGlobalIndex = afterChild;
    }
  }

  return all;
}

export function wrapFindIndex(index: number, length: number): number {
  if (length === 0) {
    return 0;
  }
  return ((index % length) + length) % length;
}

export function groupFindMatchesByLine(
  matches: ConversationFindMatch[]
): Map<number, Map<number, ConversationFindMatch[]>> {
  const lineMap = new Map<number, Map<number, ConversationFindMatch[]>>();
  for (const match of matches) {
    let blockMap = lineMap.get(match.lineNumber);
    if (!blockMap) {
      blockMap = new Map();
      lineMap.set(match.lineNumber, blockMap);
    }
    const list = blockMap.get(match.blockIndex) ?? [];
    list.push(match);
    blockMap.set(match.blockIndex, list);
  }
  return lineMap;
}
