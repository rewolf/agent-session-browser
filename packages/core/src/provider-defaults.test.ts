import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defaultProviderRegistry } from "./provider-defaults.js";

describe("defaultProviderRegistry", () => {
  it("re-reads env-backed provider paths on each call", () => {
    const prevCursor = process.env.ASB_CURSOR_PROJECTS_DIR;
    const sid = "12121212-1212-4121-8121-121212121212";
    const firstRoot = mkdtempSync(path.join(tmpdir(), "asb-reg-a-"));
    const secondRoot = mkdtempSync(path.join(tmpdir(), "asb-reg-b-"));
    const firstJsonl = path.join(
      firstRoot,
      "root-a",
      "agent-transcripts",
      sid,
      `${sid}.jsonl`
    );
    const secondJsonl = path.join(
      secondRoot,
      "root-b",
      "agent-transcripts",
      sid,
      `${sid}.jsonl`
    );
    mkdirSync(path.dirname(firstJsonl), { recursive: true });
    mkdirSync(path.dirname(secondJsonl), { recursive: true });
    writeFileSync(firstJsonl, '{"role":"user","message":{"content":[]}}\n');
    writeFileSync(secondJsonl, '{"role":"user","message":{"content":[]}}\n');
    try {
      process.env.ASB_CURSOR_PROJECTS_DIR = firstRoot;
      const first = defaultProviderRegistry();
      const firstPath = first.get("cursor")?.findTranscriptFile(sid)?.jsonlPath;

      process.env.ASB_CURSOR_PROJECTS_DIR = secondRoot;
      const second = defaultProviderRegistry();
      const secondPath = second.get("cursor")?.findTranscriptFile(sid)?.jsonlPath;

      expect(first).not.toBe(second);
      expect(firstPath).toBe(firstJsonl);
      expect(secondPath).toBe(secondJsonl);
    } finally {
      if (prevCursor === undefined) {
        delete process.env.ASB_CURSOR_PROJECTS_DIR;
      } else {
        process.env.ASB_CURSOR_PROJECTS_DIR = prevCursor;
      }
      rmSync(firstRoot, { recursive: true, force: true });
      rmSync(secondRoot, { recursive: true, force: true });
    }
  });
});
