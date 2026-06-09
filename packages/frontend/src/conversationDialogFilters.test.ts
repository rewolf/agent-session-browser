import { describe, it, expect } from "vitest";
import {
  resolveMinimumFiltersForMessage,
  findMessageByLineNumber,
  sidechainParentUuidForLine,
} from "./conversationDialogFilters";
import type { TranscriptConversationMessage } from "./types";

function msg(
  lineNumber: number,
  blocks: TranscriptConversationMessage["blocks"],
  extra: Partial<TranscriptConversationMessage> = {}
): TranscriptConversationMessage {
  return { lineNumber, role: "user", messageAt: null, blocks, ...extra };
}

describe("resolveMinimumFiltersForMessage", () => {
  it("needs no extra filters for a plain text turn", () => {
    const message = msg(1, [{ type: "text", text: "hello" }]);
    expect(resolveMinimumFiltersForMessage(message)).toEqual({
      showToolUsages: false,
      showRedacted: false,
    });
  });

  it("enables tool usages for tool-only turns", () => {
    const message = msg(2, [
      { type: "tool_use", name: "read", detail: "{}" },
    ]);
    expect(resolveMinimumFiltersForMessage(message)).toEqual({
      showToolUsages: true,
      showRedacted: false,
    });
  });

  it("enables show redacted for redacted-only turns", () => {
    const message = msg(3, [{ type: "text", text: "[REDACTED]" }]);
    expect(resolveMinimumFiltersForMessage(message)).toEqual({
      showToolUsages: false,
      showRedacted: true,
    });
  });
});

describe("findMessageByLineNumber", () => {
  it("returns the matching message", () => {
    const messages = [msg(10, [{ type: "text", text: "a" }])];
    expect(findMessageByLineNumber(messages, 10)?.lineNumber).toBe(10);
  });
});

describe("sidechainParentUuidForLine", () => {
  it("returns parent uuid for sidechain children", () => {
    const messages = [
      msg(1, [{ type: "text", text: "parent" }], { uuid: "p1" }),
      msg(2, [{ type: "text", text: "child" }], {
        isSidechain: true,
        parentUuid: "p1",
      }),
    ];
    expect(sidechainParentUuidForLine(messages, 2)).toBe("p1");
    expect(sidechainParentUuidForLine(messages, 1)).toBeUndefined();
  });
});
