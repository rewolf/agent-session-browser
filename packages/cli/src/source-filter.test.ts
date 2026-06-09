import { describe, expect, it } from "vitest";
import type { SessionProvider } from "@asb/core";
import { ProviderRegistry } from "@asb/core";

const ampProvider: SessionProvider = {
  id: "amp",
  displayName: "Amp (stub)",
  workspaceGrouping: "fs-path",
  scanSessions: async () => ({ sessions: [] }),
  findTranscriptFile: () => null,
  listTranscriptFiles: () => [],
  loadConversation: async () => null,
  formatResumeCommandTail: () => "amp resume x",
  metadataKeys: () => [],
};

import { parseSourceOption } from "./source-filter.js";

describe("parseSourceOption with amp registered", () => {
  it("accepts amp from CLI --source", () => {
    const registry = new ProviderRegistry([ampProvider]);
    expect(parseSourceOption("amp", registry)).toBe("amp");
    expect(() => parseSourceOption("claude", registry)).toThrow(
      /Accepted values: amp, all/
    );
  });
});
