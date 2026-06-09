import type { TranscriptContentBlock } from "./types";

/** Plain-text for a single block (same rules as `messageCopyText`). */
export function blockCopyText(block: TranscriptContentBlock): string {
  if (block.type === "text") {
    return block.text;
  }
  if (block.type === "thinking") {
    return `Thinking\n${block.thinking}`;
  }
  if (block.type === "tool_use") {
    return `Tool: ${block.name}\n${block.detail}`;
  }
  if (block.type === "tool_result") {
    return `Tool result\n${block.detail}`;
  }
  return `${block.label}\n${block.detail}`;
}

/** Plain-text representation of a message's blocks for clipboard copy. */
export function messageCopyText(blocks: TranscriptContentBlock[]): string {
  return blocks.map(blockCopyText).join("\n\n");
}
