import type {
  TranscriptContentBlock,
  TranscriptConversationMessage,
} from "./types";

export type MessageOrder = "chronological" | "reverse";

export type DialogItem =
  | { kind: "message"; message: TranscriptConversationMessage }
  | { kind: "redacted-gap"; count: number };

function isToolBlock(block: TranscriptContentBlock): boolean {
  return block.type === "tool_use" || block.type === "tool_result";
}

function isRedactedBlock(block: TranscriptContentBlock): boolean {
  return block.type === "text" && block.text.trim() === "[REDACTED]";
}

function filterConversationBlocks(
  blocks: TranscriptContentBlock[],
  showToolUsages: boolean
): TranscriptContentBlock[] {
  if (showToolUsages) {
    return blocks;
  }
  return blocks.filter((b) => !isToolBlock(b));
}

function filterRedactedBlocks(
  blocks: TranscriptContentBlock[],
  showRedacted: boolean
): TranscriptContentBlock[] {
  if (showRedacted) {
    return blocks;
  }
  return blocks.filter((b) => !isRedactedBlock(b));
}

export function blocksForDisplay(
  blocks: TranscriptContentBlock[],
  showToolUsages: boolean,
  showRedacted: boolean
): TranscriptContentBlock[] {
  return filterRedactedBlocks(
    filterConversationBlocks(blocks, showToolUsages),
    showRedacted
  );
}

export function isRedactedOnlyMessage(
  message: TranscriptConversationMessage,
  showToolUsages: boolean,
  showRedacted: boolean
): boolean {
  if (showRedacted) {
    return false;
  }
  const afterTools = filterConversationBlocks(message.blocks, showToolUsages);
  if (afterTools.length === 0) {
    return false;
  }
  return afterTools.every(isRedactedBlock);
}

export function isMessageVisibleInDialog(
  message: TranscriptConversationMessage,
  showToolUsages: boolean,
  showRedacted: boolean
): boolean {
  if (isRedactedOnlyMessage(message, showToolUsages, showRedacted)) {
    return false;
  }
  return (
    blocksForDisplay(message.blocks, showToolUsages, showRedacted).length > 0
  );
}

/** Minimum filter flags so the given message can appear in the dialog. */
export function resolveMinimumFiltersForMessage(
  message: TranscriptConversationMessage
): { showToolUsages: boolean; showRedacted: boolean } {
  if (isMessageVisibleInDialog(message, false, false)) {
    return { showToolUsages: false, showRedacted: false };
  }
  if (isMessageVisibleInDialog(message, true, false)) {
    return { showToolUsages: true, showRedacted: false };
  }
  if (isMessageVisibleInDialog(message, false, true)) {
    return { showToolUsages: false, showRedacted: true };
  }
  return { showToolUsages: true, showRedacted: true };
}

export function findMessageByLineNumber(
  messages: TranscriptConversationMessage[],
  lineNumber: number
): TranscriptConversationMessage | undefined {
  return messages.find((m) => m.lineNumber === lineNumber);
}

export function sidechainParentUuidForLine(
  messages: TranscriptConversationMessage[],
  lineNumber: number
): string | undefined {
  const msg = findMessageByLineNumber(messages, lineNumber);
  if (msg?.isSidechain && msg.parentUuid) {
    return msg.parentUuid;
  }
  return undefined;
}

export function buildConversationDialogItems(
  messages: TranscriptConversationMessage[],
  showToolUsages: boolean,
  showRedacted: boolean,
  messageOrder: MessageOrder
): DialogItem[] {
  const sorted = [...messages].sort((a, b) => a.lineNumber - b.lineNumber);
  if (messageOrder === "reverse") {
    sorted.reverse();
  }

  const items: DialogItem[] = [];
  let redactedRun = 0;

  const flushRedacted = () => {
    if (redactedRun > 0) {
      items.push({ kind: "redacted-gap", count: redactedRun });
      redactedRun = 0;
    }
  };

  for (const msg of sorted) {
    if (isRedactedOnlyMessage(msg, showToolUsages, showRedacted)) {
      redactedRun++;
      continue;
    }
    const blocks = blocksForDisplay(msg.blocks, showToolUsages, showRedacted);
    if (blocks.length === 0) {
      continue;
    }
    flushRedacted();
    items.push({ kind: "message", message: { ...msg, blocks } });
  }
  flushRedacted();
  return items;
}
