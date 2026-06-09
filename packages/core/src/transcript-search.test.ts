import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultProviderRegistry } from "./provider-defaults.js";
import {
  compareTranscriptHitsNewestFirst,
  extractJsonlLineMessageTime,
  extractJsonlLineRole,
  searchTranscriptLines,
} from "./transcript-search.js";

function registryForCursorProjects(root: string) {
  return defaultProviderRegistry({
    cursorProjectsDir: root,
    claudeProjectsDir: path.join(root, "no-claude"),
  });
}

describe("searchTranscriptLines", () => {
  it("finds case-insensitive substring matches", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-ts-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const sid = "22222222-2222-4222-8222-222222222222";
      const proj = path.join(root, slug, "agent-transcripts", sid);
      mkdirSync(proj, { recursive: true });
      const jsonl = path.join(proj, `${sid}.jsonl`);
      writeFileSync(
        jsonl,
        '{"a":1}\n{"needle":"Hello UNIQUE_TOKEN_xyz"}\n{"b":2}\n'
      );
      const hits = await searchTranscriptLines("unique_token", {
        limit: 50,
        registry: registryForCursorProjects(root),
      });
      expect(hits).toHaveLength(1);
      expect(hits[0]!.lineNumber).toBe(2);
      expect(hits[0]!.sessionId).toBe(sid);
      expect(hits[0]!.preview).toContain("UNIQUE_TOKEN");
      expect(hits[0]!.role).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("respects sessionIds allowlist", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-ts2-"));
    try {
      const sid1 = "33333333-3333-4333-8333-333333333333";
      const sid2 = "44444444-4444-4444-8444-444444444444";
      for (const sid of [sid1, sid2]) {
        const proj = path.join(root, "slug", "agent-transcripts", sid);
        mkdirSync(proj, { recursive: true });
        writeFileSync(
          path.join(proj, `${sid}.jsonl`),
          '{"text":"FINDME"}\n'
        );
      }
      const hits = await searchTranscriptLines("FINDME", {
        limit: 50,
        registry: registryForCursorProjects(root),
        sessionIds: new Set([sid2]),
      });
      expect(hits).toHaveLength(1);
      expect(hits[0]!.sessionId).toBe(sid2);
      expect(hits[0]!.role).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns empty for blank needle", async () => {
    const hits = await searchTranscriptLines("   ", {
      limit: 10,
      registry: defaultProviderRegistry(),
    });
    expect(hits).toEqual([]);
  });

  it("filters by JSON role when role option is set", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-ts-role-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const sid = "55555555-5555-4555-8555-555555555555";
      const proj = path.join(root, slug, "agent-transcripts", sid);
      mkdirSync(proj, { recursive: true });
      const jsonl = path.join(proj, `${sid}.jsonl`);
      writeFileSync(
        jsonl,
        '{"role":"assistant","body":"SHARED_TOKEN"}\n{"role":"user","body":"SHARED_TOKEN"}\n'
      );
      const both = await searchTranscriptLines("SHARED_TOKEN", {
        limit: 50,
        registry: registryForCursorProjects(root),
      });
      expect(both).toHaveLength(2);
      const userOnly = await searchTranscriptLines("SHARED_TOKEN", {
        limit: 50,
        registry: registryForCursorProjects(root),
        role: "User",
      });
      expect(userOnly).toHaveLength(1);
      expect(userOnly[0]!.role).toBe("user");
      expect(userOnly[0]!.lineNumber).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("extractJsonlLineRole", () => {
  it("reads top-level role from JSON object lines", () => {
    expect(
      extractJsonlLineRole('{"role":"system","x":1}')
    ).toBe("system");
    expect(extractJsonlLineRole("not json")).toBeNull();
    expect(extractJsonlLineRole('{"x":1}')).toBeNull();
  });
});

describe("extractJsonlLineMessageTime", () => {
  it("reads timestamp fields from JSON object lines", () => {
    expect(
      extractJsonlLineMessageTime('{"timestamp":1700000000000,"role":"user"}')
    ).toBe(1700000000000);
    expect(
      extractJsonlLineMessageTime(
        '{"message":{"messageTime":1700000001000},"role":"assistant"}'
      )
    ).toBe(1700000001000);
    expect(extractJsonlLineMessageTime('{"role":"user"}')).toBeNull();
  });
});

describe("search result ordering", () => {
  it("returns newest hits first by message time, else session updatedAt", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-ts-sort-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const sidOld = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const sidNew = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
      for (const [sid, ts] of [
        [sidOld, 1_700_000_005_000] as const,
        [sidNew, 1_700_000_008_000] as const,
      ]) {
        const proj = path.join(root, slug, "agent-transcripts", sid);
        mkdirSync(proj, { recursive: true });
        writeFileSync(
          path.join(proj, `${sid}.jsonl`),
          `{"role":"user","timestamp":${ts},"text":"SORTME"}\n`
        );
      }
      const hits = await searchTranscriptLines("SORTME", {
        limit: 10,
        registry: registryForCursorProjects(root),
        sessionUpdatedAt: new Map([
          [sidOld, 1000],
          [sidNew, 9000],
        ]),
      });
      expect(hits).toHaveLength(2);
      expect(hits[0]!.sessionId).toBe(sidNew);
      expect(hits[0]!.messageAt).toBe(1_700_000_008_000);
      expect(hits[1]!.sessionId).toBe(sidOld);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("falls back to session updatedAt when lines lack message time", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-ts-sort2-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const sidOld = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
      const sidNew = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
      for (const sid of [sidOld, sidNew]) {
        const proj = path.join(root, slug, "agent-transcripts", sid);
        mkdirSync(proj, { recursive: true });
        writeFileSync(
          path.join(proj, `${sid}.jsonl`),
          '{"role":"user","text":"FALLBACK_TOKEN"}\n'
        );
      }
      const hits = await searchTranscriptLines("FALLBACK_TOKEN", {
        limit: 10,
        registry: registryForCursorProjects(root),
        sessionUpdatedAt: new Map([
          [sidOld, 1000],
          [sidNew, 9000],
        ]),
      });
      expect(hits).toHaveLength(2);
      expect(hits[0]!.sessionId).toBe(sidNew);
      expect(hits[0]!.messageAt).toBeNull();
      expect(hits[1]!.sessionId).toBe(sidOld);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps the newest hits when limited", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-ts-sort3-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const entries = [
        ["11111111-1111-4111-8111-111111111111", 100],
        ["22222222-2222-4222-8222-222222222222", 200],
        ["33333333-3333-4333-8333-333333333333", 300],
      ] as const;
      const updated = new Map<string, number>();
      for (const [sid, ts] of entries) {
        updated.set(sid, ts);
        const proj = path.join(root, slug, "agent-transcripts", sid);
        mkdirSync(proj, { recursive: true });
        writeFileSync(
          path.join(proj, `${sid}.jsonl`),
          '{"text":"CAP_TOKEN"}\n'
        );
      }
      const hits = await searchTranscriptLines("CAP_TOKEN", {
        limit: 2,
        registry: registryForCursorProjects(root),
        sessionUpdatedAt: updated,
      });
      expect(hits).toHaveLength(2);
      expect(hits.map((h) => h.sessionId)).toEqual([
        "33333333-3333-4333-8333-333333333333",
        "22222222-2222-4222-8222-222222222222",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("orders same-session hits by line number when time matches", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-ts-sort4-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const sid = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
      const proj = path.join(root, slug, "agent-transcripts", sid);
      mkdirSync(proj, { recursive: true });
      writeFileSync(
        path.join(proj, `${sid}.jsonl`),
        '{"text":"LINE_TOKEN"}\n{"text":"LINE_TOKEN"}\n{"text":"LINE_TOKEN"}\n'
      );
      const hits = await searchTranscriptLines("LINE_TOKEN", {
        limit: 10,
        registry: registryForCursorProjects(root),
        sessionUpdatedAt: new Map([[sid, 5000]]),
      });
      expect(hits).toHaveLength(3);
      expect(hits.map((h) => h.lineNumber)).toEqual([3, 2, 1]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("compareTranscriptHitsNewestFirst", () => {
  it("orders same-session ties by line number descending", () => {
    const base = {
      preview: "",
      jsonlPath: "",
      workspacePath: "",
      workspaceLeaf: "",
      role: null,
      messageAt: null,
      sessionUpdatedAt: 1000,
    };
    const early = { ...base, sessionId: "s", lineNumber: 1 };
    const late = { ...base, sessionId: "s", lineNumber: 99 };
    expect(compareTranscriptHitsNewestFirst(late, early)).toBeLessThan(0);
    expect(compareTranscriptHitsNewestFirst(early, late)).toBeGreaterThan(0);
  });

  it("orders by messageAt then sessionUpdatedAt", () => {
    const base = {
      lineNumber: 1,
      preview: "",
      jsonlPath: "",
      workspacePath: "",
      workspaceLeaf: "",
      role: null,
    };
    const a = {
      ...base,
      sessionId: "a",
      messageAt: 100,
      sessionUpdatedAt: 0,
    };
    const b = {
      ...base,
      sessionId: "b",
      messageAt: null,
      sessionUpdatedAt: 200,
    };
    expect(compareTranscriptHitsNewestFirst(b, a)).toBeLessThan(0);
    expect(compareTranscriptHitsNewestFirst(a, b)).toBeGreaterThan(0);
  });
});
