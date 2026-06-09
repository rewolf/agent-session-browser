import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CursorSessionProvider,
  mergeCursorDbAndTranscriptSessions,
  scanCursorTranscriptSessions,
  slugToWorkspacePath,
} from "./cursor-provider.js";

describe("slugToWorkspacePath", () => {
  it("maps hyphenated absolute path segments", () => {
    const exists = new Set(["/home", "/home/rewolf", "/home/rewolf/demo"]);
    const got = slugToWorkspacePath("home-rewolf-demo", (p) => exists.has(p));
    expect(got).toBe("/home/rewolf/demo");
  });

  it("keeps hyphens inside a directory name when shorter prefixes are not dirs", () => {
    const exists = new Set(["/tmp", "/tmp/proj", "/tmp/proj/my-app"]);
    const got = slugToWorkspacePath("tmp-proj-my-app", (p) => exists.has(p));
    expect(got).toBe("/tmp/proj/my-app");
  });

  it("returns null when no directory path fits", () => {
    expect(slugToWorkspacePath("nope-xyz-zz", () => false)).toBeNull();
  });
});

describe("scanCursorTranscriptSessions", () => {
  it("discovers a session under agent-transcripts", () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-proj-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const sid = "11111111-1111-4111-8111-111111111111";
      const proj = path.join(root, slug, "agent-transcripts", sid);
      mkdirSync(proj, { recursive: true });
      const jsonl = path.join(proj, `${sid}.jsonl`);
      writeFileSync(
        jsonl,
        '{"role":"user","message":{"content":[{"type":"text","text":"<user_query>\\nLater topic\\n</user_query>"}]}}\n'
      );
      const sessions = scanCursorTranscriptSessions(root);
      expect(sessions.some((s) => s.sessionId === sid)).toBe(true);
      const row = sessions.find((s) => s.sessionId === sid);
      expect(row?.source).toBe("cursor");
      expect(row?.name).toBeUndefined();
      const provider = new CursorSessionProvider("/tmp", root);
      const listed = provider.listTranscriptFiles();
      expect(listed.some((f) => f.sessionId === sid && f.jsonlPath === jsonl)).toBe(
        true
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("mergeCursorDbAndTranscriptSessions", () => {
  it("extends updatedAt when transcript is newer", () => {
    const merged = mergeCursorDbAndTranscriptSessions(
      [
        {
          sessionId: "a",
          name: "DB",
          workspacePath: "/w",
          workspaceLeaf: "w",
          workspaceRoots: ["/w"],
          createdAt: 100,
          updatedAt: 200,
          source: "cursor",
        },
      ],
      [
        {
          sessionId: "a",
          workspacePath: "/w",
          workspaceLeaf: "w",
          workspaceRoots: ["/w"],
          createdAt: 50,
          updatedAt: 500,
          source: "cursor",
        },
      ]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.updatedAt).toBe(500);
    expect(merged[0]!.createdAt).toBe(50);
    expect(merged[0]!.name).toBe("DB");
  });

  it("appends transcript-only sessions", () => {
    const merged = mergeCursorDbAndTranscriptSessions(
      [
        {
          sessionId: "a",
          workspacePath: "/w",
          workspaceLeaf: "w",
          workspaceRoots: ["/w"],
          createdAt: 1,
          updatedAt: 2,
          source: "cursor",
        },
      ],
      [
        {
          sessionId: "b",
          workspacePath: "/w",
          workspaceLeaf: "w",
          workspaceRoots: ["/w"],
          createdAt: 3,
          updatedAt: 4,
          source: "cursor",
        },
      ]
    );
    expect(merged.map((m) => m.sessionId).sort()).toEqual(["a", "b"]);
    expect(merged.find((m) => m.sessionId === "b")?.name).toBeUndefined();
  });
});
