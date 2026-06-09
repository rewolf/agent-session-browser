import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CursorSessionProvider } from "./cursor-provider.js";
import { defaultProviderRegistry } from "./provider-defaults.js";
import {
  loadSessionConversation,
  loadSessionConversationBySource,
  parseJsonlConversationLine,
  stripUserQueryTags,
} from "./transcript-conversation.js";

describe("stripUserQueryTags", () => {
  it("unwraps user_query tags and trims", () => {
    expect(
      stripUserQueryTags(
        "<user_query>\nHow does nav work?\n</user_query>"
      )
    ).toBe("How does nav work?");
  });

  it("leaves plain text unchanged", () => {
    expect(stripUserQueryTags("Hello")).toBe("Hello");
  });
});

describe("parseJsonlConversationLine", () => {
  it("extracts text and tool_use blocks", () => {
    const line = JSON.stringify({
      role: "assistant",
      message: {
        content: [
          { type: "text", text: "Hello" },
          { type: "tool_use", name: "Read", input: { path: "/tmp/x" } },
        ],
      },
    });
    const msg = parseJsonlConversationLine(line, 1);
    expect(msg?.role).toBe("assistant");
    expect(msg?.blocks).toHaveLength(2);
    expect(msg?.blocks[0]).toEqual({ type: "text", text: "Hello" });
    expect(msg?.blocks[1]?.type).toBe("tool_use");
  });

  it("parses Claude string message.content as a text block", () => {
    const line = JSON.stringify({
      parentUuid: "d6ea9bc1-0000-4000-8000-000000000001",
      isSidechain: false,
      type: "user",
      message: {
        role: "user",
        content:
          "Hey claude. Can you explain where your conversations / sessions are stored locally",
      },
      uuid: "effffb24-0000-4000-8000-000000000002",
      timestamp: "2026-05-26T05:54:44.540Z",
      sessionId: "26a4b702-11e2-42ff-98ee-189ea91f4faa",
    });
    const msg = parseJsonlConversationLine(line, 1);
    expect(msg?.role).toBe("user");
    expect(msg?.blocks).toEqual([
      {
        type: "text",
        text: "Hey claude. Can you explain where your conversations / sessions are stored locally",
      },
    ]);
  });

  it("parses Claude thinking blocks without signature", () => {
    const line = JSON.stringify({
      message: {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking:
              "Let me think about where Claude stores conversations…",
            signature: "EvECCmMIDhgCKkAIXFMIr9zLopaqueblob",
          },
        ],
      },
    });
    const msg = parseJsonlConversationLine(line, 2);
    expect(msg?.blocks).toEqual([
      {
        type: "thinking",
        thinking: "Let me think about where Claude stores conversations…",
      },
    ]);
    expect(JSON.stringify(msg?.blocks)).not.toContain("signature");
  });

  it("Cursor array-content blocks match golden snapshot (regression)", () => {
    const line = JSON.stringify({
      role: "assistant",
      message: {
        content: [
          { type: "text", text: "Hello" },
          { type: "tool_use", name: "Read", input: { path: "/tmp/x" } },
        ],
      },
    });
    const msg = parseJsonlConversationLine(line, 1);
    expect(msg?.blocks).toMatchInlineSnapshot(`
      [
        {
          "text": "Hello",
          "type": "text",
        },
        {
          "detail": "{"path":"/tmp/x"}",
          "name": "Read",
          "type": "tool_use",
        },
      ]
    `);
  });

  it("retains Claude sidechain linkage fields", () => {
    const line = JSON.stringify({
      role: "assistant",
      uuid: "msg-a",
      parentUuid: "msg-root",
      isSidechain: true,
      message: { content: [{ type: "text", text: "sub" }] },
    });
    const parsed = parseJsonlConversationLine(line, 5);
    expect(parsed?.uuid).toBe("msg-a");
    expect(parsed?.parentUuid).toBe("msg-root");
    expect(parsed?.isSidechain).toBe(true);
  });
});

describe("loadSessionConversation", () => {
  it("reads all lines from a session jsonl", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-conv-"));
    try {
      const slug = "tmp-csbuser-demoapp";
      const sid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const proj = path.join(root, slug, "agent-transcripts", sid);
      mkdirSync(proj, { recursive: true });
      writeFileSync(
        path.join(proj, `${sid}.jsonl`),
        '{"role":"user","message":{"content":[{"type":"text","text":"Hi"}]}}\n{"role":"assistant","message":{"content":[{"type":"text","text":"Hey"}]}}\n'
      );
      const provider = new CursorSessionProvider("/tmp", root);
      const ref = provider.findTranscriptFile(sid);
      expect(ref).not.toBeNull();
      const conv = await loadSessionConversation(ref!);
      expect(conv?.messages).toHaveLength(2);
      expect(conv?.messages[0]?.role).toBe("user");
      expect(conv?.messages[1]?.blocks[0]).toEqual({
        type: "text",
        text: "Hey",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns null when jsonl is missing", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-conv2-"));
    try {
      // Explicit source required — no silent cursor default.
      expect(
        await loadSessionConversationBySource(
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          "cursor",
          defaultProviderRegistry()
        )
      ).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("throws for an unknown session source", async () => {
    await expect(
      loadSessionConversationBySource(
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "made-up-source" as "cursor",
        defaultProviderRegistry()
      )
    ).rejects.toThrow(/Unknown session source/);
  });
});
