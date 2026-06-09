import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  defaultProviderRegistry,
  ProviderRegistry,
  type Session,
  type SessionProvider,
  type TranscriptFileRef,
} from "@asb/core";
import { requireSessionSource, serializeSession } from "./session-response.js";

function session(overrides: Partial<Session> & Pick<Session, "sessionId">): Session {
  return {
    workspacePath: "/ws/demo",
    workspaceLeaf: "demo",
    workspaceRoots: ["/ws/demo"],
    createdAt: 1,
    updatedAt: 2,
    source: "cursor",
    ...overrides,
  };
}

describe("requireSessionSource", () => {
  it("returns the source when present", () => {
    expect(requireSessionSource(session({ sessionId: "a" }))).toBe("cursor");
  });

  it("throws when source is missing", () => {
    expect(() =>
      requireSessionSource(
        session({
          sessionId: "bad-1",
          source: undefined as unknown as Session["source"],
        })
      )
    ).toThrow(/Session bad-1 has no source/);
  });
});

describe("serializeSession", () => {
  const registry = defaultProviderRegistry();

  it("includes source and resumeCommand from a tagged session row", () => {
    const payload = serializeSession(
      session({ sessionId: "ok-1", source: "claude" }),
      registry
    );
    expect(payload.source).toBe("claude");
    expect(payload.resumeCommand).toBe(
      "cd /ws/demo && claude --resume ok-1"
    );
  });

  it("throws for an untagged session row", () => {
    expect(() =>
      serializeSession(
        session({
          sessionId: "untagged",
          source: undefined as unknown as Session["source"],
        }),
        registry
      )
    ).toThrow(/Session untagged has no source/);
  });

  it("includes excerpt null when provider has no transcript file", () => {
    const payload = serializeSession(
      session({ sessionId: "ok-1", source: "claude" }),
      registry
    );
    expect(payload.excerpt).toBeNull();
  });
});

describe("serializeSession excerpt", () => {
  const TRANSCRIPT_SOURCE = "test-transcript" as Session["source"];
  const sessionId = "66666666-6666-4666-8666-666666666666";
  let jsonlPath = "";
  let registry: ProviderRegistry;

  class TranscriptStubProvider implements SessionProvider {
    readonly id = TRANSCRIPT_SOURCE;
    readonly displayName = "Transcript Stub";
    readonly workspaceGrouping = "none" as const;

    async scanSessions() {
      return { sessions: [] };
    }

    findTranscriptFile(sid: string): TranscriptFileRef | null {
      if (sid !== sessionId) {
        return null;
      }
      return {
        sessionId,
        jsonlPath,
        workspacePath: "/ws/demo",
        workspaceLeaf: "demo",
        source: TRANSCRIPT_SOURCE,
      };
    }

    listTranscriptFiles() {
      return [];
    }

    async loadConversation() {
      return null;
    }

    formatResumeCommandTail(s: Session) {
      return `stub resume ${s.sessionId}`;
    }

    metadataKeys() {
      return [];
    }
  }

  beforeEach(() => {
    const root = mkdtempSync(path.join(tmpdir(), "asb-excerpt-"));
    mkdirSync(root, { recursive: true });
    jsonlPath = path.join(root, `${sessionId}.jsonl`);
    writeFileSync(
      jsonlPath,
      JSON.stringify({
        type: "user",
        message: {
          content: [{ type: "text", text: "First user message for excerpt preview" }],
        },
      }) + "\n"
    );
    registry = new ProviderRegistry([new TranscriptStubProvider()]);
  });

  afterEach(() => {
    if (jsonlPath) {
      rmSync(path.dirname(jsonlPath), { recursive: true, force: true });
    }
  });

  it("derives excerpt from first user message in transcript", () => {
    const payload = serializeSession(
      session({ sessionId, source: TRANSCRIPT_SOURCE }),
      registry
    );
    expect(payload.excerpt).toBe("First user message for excerpt preview");
  });

  it("returns null excerpt when transcript file is missing", () => {
    const payload = serializeSession(
      session({
        sessionId: "77777777-7777-4777-8777-777777777777",
        source: TRANSCRIPT_SOURCE,
      }),
      registry
    );
    expect(payload.excerpt).toBeNull();
  });
});
