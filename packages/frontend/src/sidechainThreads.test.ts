import { describe, expect, it } from "vitest";
import type { TranscriptConversationMessage } from "./types";
import { indexSidechainThreads } from "./sidechainThreads";

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

describe("indexSidechainThreads (frontend)", () => {
  it("groups sidechain children under parent uuid", () => {
    const messages = [
      msg(1, { uuid: "p1" }),
      msg(2, { uuid: "c1", parentUuid: "p1", isSidechain: true }),
    ];
    const { topLevel, childrenByParentUuid } = indexSidechainThreads(messages);
    expect(topLevel).toHaveLength(1);
    expect(childrenByParentUuid.get("p1")).toHaveLength(1);
  });
});
