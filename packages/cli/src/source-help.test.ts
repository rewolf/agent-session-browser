import { describe, expect, it } from "vitest";
import type { SessionProvider } from "@asb/core";
import { ProviderRegistry } from "@asb/core";
import {
  formatSourceCliDescription,
  formatSourceCliPlaceholder,
} from "./source-help.js";

const stubFields = {
  workspaceGrouping: "fs-path" as const,
  scanSessions: async () => ({ sessions: [] as never[] }),
  findTranscriptFile: () => null,
  listTranscriptFiles: () => [],
  loadConversation: async () => null,
  formatResumeCommandTail: () => "",
  metadataKeys: () => [],
};

const cursorStub: SessionProvider = {
  id: "cursor",
  displayName: "Cursor",
  ...stubFields,
};

const claudeStub: SessionProvider = {
  id: "claude",
  displayName: "Claude",
  ...stubFields,
};

const ampStub: SessionProvider = {
  id: "amp",
  displayName: "Amp",
  ...stubFields,
};

describe("formatSourceCliPlaceholder", () => {
  it("matches default registry help for cursor and claude", () => {
    const ids = new ProviderRegistry([cursorStub, claudeStub]).ids();
    expect(formatSourceCliPlaceholder(ids)).toBe("<cursor|claude|all>");
  });

  it("includes amp when registered", () => {
    const ids = new ProviderRegistry([cursorStub, claudeStub, ampStub]).ids();
    expect(formatSourceCliPlaceholder(ids)).toBe("<cursor|claude|amp|all>");
  });
});

describe("formatSourceCliDescription", () => {
  it("matches default registry help for cursor and claude", () => {
    const ids = new ProviderRegistry([cursorStub, claudeStub]).ids();
    expect(formatSourceCliDescription(ids)).toBe(
      "Filter sessions by source: cursor, claude, or all (default: all)"
    );
  });
});
