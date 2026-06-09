/** @vitest-environment node */
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
  formatResumeCommandTail: (s) => `amp resume ${s.sessionId}`,
  metadataKeys: () => [],
};

import { parseSourceQuery } from "./source-query.js";

describe("parseSourceQuery with amp registered", () => {
  it("accepts amp without editing source-query dispatch logic", () => {
    const registry = new ProviderRegistry([ampProvider]);
    expect(parseSourceQuery("amp", registry)).toBe("amp");
    expect(parseSourceQuery("AMP", registry)).toBe("amp");
    expect(() => parseSourceQuery("cursor", registry)).toThrow(
      /Accepted values: amp, all/
    );
  });
});
