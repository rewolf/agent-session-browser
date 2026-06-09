import { describe, it, expect } from "vitest";
import {
  collectConversationFindMatches,
  findCaseInsensitiveMatches,
  wrapFindIndex,
} from "./conversationFind";
import { buildConversationDialogItems } from "./conversationDialogFilters";
import { indexSidechainThreads } from "./sidechainThreads";
import type { TranscriptConversationMessage } from "./types";

describe("findCaseInsensitiveMatches", () => {
  it("finds case-insensitive non-overlapping substrings", () => {
    expect(findCaseInsensitiveMatches("Hello HELLO", "hello")).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 11 },
    ]);
  });

  it("returns empty for blank query", () => {
    expect(findCaseInsensitiveMatches("abc", "  ")).toEqual([]);
  });
});

describe("wrapFindIndex", () => {
  it("wraps forward and backward", () => {
    expect(wrapFindIndex(2, 3)).toBe(2);
    expect(wrapFindIndex(3, 3)).toBe(0);
    expect(wrapFindIndex(-1, 3)).toBe(2);
  });
});

describe("collectConversationFindMatches", () => {
  const messages: TranscriptConversationMessage[] = [
    {
      lineNumber: 1,
      role: "user",
      uuid: "p1",
      blocks: [{ type: "text", text: "Alpha beta" }],
    },
    {
      lineNumber: 2,
      role: "assistant",
      uuid: "c1",
      parentUuid: "p1",
      isSidechain: true,
      blocks: [{ type: "text", text: "sidechain beta" }],
    },
    {
      lineNumber: 3,
      role: "assistant",
      blocks: [
        { type: "tool_use", name: "grep", detail: "hidden tool" },
      ],
    },
  ];

  it("orders parent then sidechain and respects tool filter", () => {
    const threadIndex = indexSidechainThreads(messages);
    const items = buildConversationDialogItems(
      threadIndex.topLevel,
      false,
      true,
      "chronological"
    );
    const matches = collectConversationFindMatches(
      items,
      threadIndex,
      false,
      true,
      "beta"
    );
    expect(matches.map((m) => m.lineNumber)).toEqual([1, 2]);
    expect(matches[1].parentUuid).toBe("p1");
  });

  it("excludes tool blocks when showToolUsages is false", () => {
    const threadIndex = indexSidechainThreads(messages);
    const items = buildConversationDialogItems(
      threadIndex.topLevel,
      false,
      true,
      "chronological"
    );
    const matches = collectConversationFindMatches(
      items,
      threadIndex,
      false,
      true,
      "hidden"
    );
    expect(matches).toHaveLength(0);
  });

  it("follows reversed top-level dialog order", () => {
    const threadIndex = indexSidechainThreads(messages);
    const items = buildConversationDialogItems(
      threadIndex.topLevel,
      true,
      true,
      "reverse"
    );
    const matches = collectConversationFindMatches(
      items,
      threadIndex,
      true,
      true,
      "hidden"
    );
    expect(matches[0].lineNumber).toBe(3);
  });
});
