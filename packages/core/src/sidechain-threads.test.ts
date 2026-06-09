import { describe, expect, it } from "vitest";
import type { TranscriptConversationMessage } from "./transcript-conversation.js";
import { indexSidechainThreads } from "./sidechain-threads.js";

function msg(
  lineNumber: number,
  extra: Partial<TranscriptConversationMessage> = {}
): TranscriptConversationMessage {
  return {
    lineNumber,
    role: "assistant",
    messageAt: null,
    blocks: [{ type: "text", text: `line ${lineNumber}` }],
    ...extra,
  };
}

describe("indexSidechainThreads", () => {
  it("nests sidechain lines under parent uuid", () => {
    const messages = [
      msg(1, { uuid: "parent-1", role: "user" }),
      msg(2, {
        uuid: "child-1",
        parentUuid: "parent-1",
        isSidechain: true,
      }),
      msg(3, { uuid: "solo" }),
    ];
    const { topLevel, childrenByParentUuid } = indexSidechainThreads(messages);
    expect(topLevel.map((m) => m.lineNumber)).toEqual([1, 3]);
    expect(childrenByParentUuid.get("parent-1")?.map((m) => m.lineNumber)).toEqual(
      [2]
    );
  });

  it("keeps orphan sidechains in top level when parent is missing", () => {
    const messages = [
      msg(1, {
        uuid: "orphan",
        parentUuid: "missing",
        isSidechain: true,
      }),
    ];
    const { topLevel, childrenByParentUuid } = indexSidechainThreads(messages);
    expect(topLevel).toHaveLength(1);
    expect(childrenByParentUuid.size).toBe(0);
  });
});
