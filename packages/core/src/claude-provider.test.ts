import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ClaudeSessionProvider,
  hashedPathToWorkspacePath,
  resolveClaudeProjectsDir,
  scanClaudeSessions,
} from "./claude-provider.js";
import { defaultProviderRegistry } from "./provider-defaults.js";
import { clearSessionTitleCache } from "./session-title.js";
import { loadAllSessions } from "./index.js";
import {
  loadSessionConversation,
  loadSessionConversationBySource,
} from "./transcript-conversation.js";

describe("hashedPathToWorkspacePath", () => {
  it("maps hyphenated absolute path segments", () => {
    const exists = new Set(["/home", "/home/rewolf", "/home/rewolf/demo"]);
    const got = hashedPathToWorkspacePath("home-rewolf-demo", (p) =>
      exists.has(p)
    );
    expect(got).toBe("/home/rewolf/demo");
  });

  it("keeps hyphens inside a directory name when shorter prefixes are not dirs", () => {
    const exists = new Set(["/tmp", "/tmp/proj", "/tmp/proj/my-app"]);
    const got = hashedPathToWorkspacePath("tmp-proj-my-app", (p) =>
      exists.has(p)
    );
    expect(got).toBe("/tmp/proj/my-app");
  });

  it("returns null when no directory path fits", () => {
    expect(hashedPathToWorkspacePath("nope-xyz-zz", () => false)).toBeNull();
  });
});

describe("resolveClaudeProjectsDir", () => {
  it("returns ASB_CLAUDE_PROJECTS_DIR when set", () => {
    const prev = process.env.ASB_CLAUDE_PROJECTS_DIR;
    process.env.ASB_CLAUDE_PROJECTS_DIR = "/tmp/fake-claude";
    try {
      expect(resolveClaudeProjectsDir()).toBe(
        path.resolve("/tmp/fake-claude")
      );
    } finally {
      if (prev === undefined) {
        delete process.env.ASB_CLAUDE_PROJECTS_DIR;
      } else {
        process.env.ASB_CLAUDE_PROJECTS_DIR = prev;
      }
    }
  });
});

describe("scanClaudeSessions", () => {
  it("discovers sessions with source claude and derived title", () => {
    clearSessionTitleCache();
    const root = mkdtempSync(path.join(tmpdir(), "asb-claude-"));
    try {
      const hash = "tmp-csbuser-demoapp";
      const sid = "55555555-5555-4555-8555-555555555555";
      const hashDir = path.join(root, hash);
      mkdirSync(hashDir, { recursive: true });
      const jsonl = path.join(hashDir, `${sid}.jsonl`);
      const titleText = "Refactor the auth middleware for clearer error handling";
      writeFileSync(
        jsonl,
        JSON.stringify({
          type: "user",
          timestamp: "2026-01-15T10:00:00.000Z",
          message: {
            content: [{ type: "text", text: titleText }],
          },
        }) +
          "\n" +
          JSON.stringify({
            type: "assistant",
            timestamp: "2026-01-15T10:01:00.000Z",
            message: { content: [{ type: "text", text: "OK" }] },
          }) +
          "\n"
      );
      const sessions = scanClaudeSessions(root);
      const row = sessions.find((s) => s.sessionId === sid);
      expect(row).toBeDefined();
      expect(row?.source).toBe("claude");
      expect(row?.workspaceRoots).toEqual([path.join(root, hash)]);
      expect(row?.name).toBeDefined();
      expect(row!.name!.length).toBeLessThanOrEqual(81);
      expect(row?.name).toContain("Refactor the auth middleware");
      const provider = new ClaudeSessionProvider(root);
      const listed = provider.listTranscriptFiles();
      expect(listed.some((f) => f.sessionId === sid && f.jsonlPath === jsonl)).toBe(
        true
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("records metadata from JSONL events", () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-claude-meta-"));
    try {
      const hash = "proj-only";
      const sid = "66666666-6666-4666-8666-666666666666";
      const hashDir = path.join(root, hash);
      mkdirSync(hashDir, { recursive: true });
      writeFileSync(
        path.join(hashDir, `${sid}.jsonl`),
        [
          JSON.stringify({
            type: "user",
            gitBranch: "main",
            version: "1.2.3",
            isSidechain: true,
            message: { content: [{ type: "text", text: "Hi" }] },
          }),
          JSON.stringify({
            type: "permission-mode",
            mode: "acceptEdits",
            timestamp: "2026-02-01T12:00:00.000Z",
          }),
        ].join("\n") + "\n"
      );
      const row = scanClaudeSessions(root).find((s) => s.sessionId === sid);
      expect(row?.metadata).toEqual({
        gitBranch: "main",
        cliVersion: "1.2.3",
        permissionMode: "acceptEdits",
        hasSidechains: "true",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("loadSessionConversation (claude)", () => {
  it("loads messages with roles and tool blocks", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-claude-conv-"));
    const prevClaude = process.env.ASB_CLAUDE_PROJECTS_DIR;
    process.env.ASB_CLAUDE_PROJECTS_DIR = root;
    try {
      const hash = "tmp-proj";
      const sid = "77777777-7777-4777-8777-777777777777";
      const hashDir = path.join(root, hash);
      mkdirSync(hashDir, { recursive: true });
      writeFileSync(
        path.join(hashDir, `${sid}.jsonl`),
        [
          JSON.stringify({
            type: "user",
            timestamp: "2026-03-01T08:00:00.000Z",
            message: { content: [{ type: "text", text: "Run tool" }] },
          }),
          JSON.stringify({
            type: "assistant",
            message: {
              content: [
                { type: "text", text: "Calling" },
                {
                  type: "tool_use",
                  name: "Bash",
                  input: { command: "echo hi" },
                },
              ],
            },
          }),
          JSON.stringify({
            type: "user",
            message: {
              content: [
                {
                  type: "tool_result",
                  content: "hi\n",
                },
              ],
            },
          }),
        ].join("\n") + "\n"
      );
      const provider = new ClaudeSessionProvider(root);
      const meta = provider.findTranscriptFile(sid);
      expect(meta).not.toBeNull();
      const conv = await loadSessionConversationBySource(
        sid,
        "claude",
        defaultProviderRegistry()
      );
      expect(conv?.messages.length).toBeGreaterThanOrEqual(3);
      expect(conv?.messages[0]?.role).toBe("user");
      expect(conv?.messages[0]?.messageAt).toBe(
        Date.parse("2026-03-01T08:00:00.000Z")
      );
      const assistant = conv?.messages.find((m) => m.role === "assistant");
      expect(assistant?.blocks.some((b) => b.type === "tool_use")).toBe(true);
      const toolResult = conv?.messages.find((m) =>
        m.blocks.some((b) => b.type === "tool_result")
      );
      expect(toolResult).toBeDefined();
      const withMeta = await loadSessionConversation(meta!);
      expect(withMeta?.sessionId).toBe(sid);
    } finally {
      if (prevClaude === undefined) {
        delete process.env.ASB_CLAUDE_PROJECTS_DIR;
      } else {
        process.env.ASB_CLAUDE_PROJECTS_DIR = prevClaude;
      }
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("loadAllSessions", () => {
  it("includes cursor and claude sources separately", async () => {
    const claudeRoot = mkdtempSync(path.join(tmpdir(), "asb-merge-claude-"));
    const cursorRoot = mkdtempSync(path.join(tmpdir(), "asb-merge-cursor-"));
    const prevClaude = process.env.ASB_CLAUDE_PROJECTS_DIR;
    const prevCursor = process.env.ASB_CURSOR_PROJECTS_DIR;
    process.env.ASB_CLAUDE_PROJECTS_DIR = claudeRoot;
    process.env.ASB_CURSOR_PROJECTS_DIR = cursorRoot;
    try {
      const claudeSid = "88888888-8888-4888-8888-888888888888";
      const claudeHash = "merge-claude-proj";
      mkdirSync(path.join(claudeRoot, claudeHash), { recursive: true });
      writeFileSync(
        path.join(claudeRoot, claudeHash, `${claudeSid}.jsonl`),
        JSON.stringify({
          type: "user",
          message: { content: [{ type: "text", text: "Claude only" }] },
        }) + "\n"
      );

      const cursorSid = "99999999-9999-4999-8999-999999999999";
      const slug = "tmp-merge-cursor";
      const cursorProj = path.join(
        cursorRoot,
        slug,
        "agent-transcripts",
        cursorSid
      );
      mkdirSync(cursorProj, { recursive: true });
      writeFileSync(
        path.join(cursorProj, `${cursorSid}.jsonl`),
        '{"role":"user","message":{"content":[{"type":"text","text":"Cursor only"}]}}\n'
      );

      const { sessions: merged } = await loadAllSessions(
        defaultProviderRegistry({
          cursorUserDir: path.join(cursorRoot, "nonexistent-user"),
          cursorProjectsDir: cursorRoot,
          claudeProjectsDir: claudeRoot,
        })
      );
      expect(merged.some((s) => s.source === "claude" && s.sessionId === claudeSid)).toBe(
        true
      );
      expect(
        merged.some((s) => s.source === "cursor" && s.sessionId === cursorSid)
      ).toBe(true);
    } finally {
      if (prevClaude === undefined) {
        delete process.env.ASB_CLAUDE_PROJECTS_DIR;
      } else {
        process.env.ASB_CLAUDE_PROJECTS_DIR = prevClaude;
      }
      if (prevCursor === undefined) {
        delete process.env.ASB_CURSOR_PROJECTS_DIR;
      } else {
        process.env.ASB_CURSOR_PROJECTS_DIR = prevCursor;
      }
      rmSync(claudeRoot, { recursive: true, force: true });
      rmSync(cursorRoot, { recursive: true, force: true });
    }
  });
});
