import { describe, expect, it } from "vitest";
import {
  filterSessionsByTextQ,
  filterSessionsStarredOnly,
  sessionMatchesTextQ,
} from "./sessionClientFilter";
import type { ApiSession } from "./types";

function mkSession(overrides: Partial<ApiSession>): ApiSession {
  const now = Date.now();
  return {
    sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    source: "cursor",
    resumeCommand: "cursor resume x",
    primaryActions: [],
    name: "Original name",
    workspacePath: "/ws",
    workspaceLeaf: "ws",
    workspaceRoots: ["/ws"],
    createdAt: now,
    updatedAt: now,
    createdAtIso: new Date(now).toISOString(),
    updatedAtIso: new Date(now).toISOString(),
    metadata: null,
    ...overrides,
  };
}

describe("sessionClientFilter", () => {
  const annotations = {
    "cursor:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
      alias: "Pinned work",
      bookmarked: true,
    },
  };

  it("matches provider name, id, and alias case-insensitively", () => {
    const session = mkSession({});
    expect(sessionMatchesTextQ(session, "original", annotations)).toBe(true);
    expect(sessionMatchesTextQ(session, "AAAA", annotations)).toBe(true);
    expect(sessionMatchesTextQ(session, "pinned", annotations)).toBe(true);
    expect(sessionMatchesTextQ(session, "missing", annotations)).toBe(false);
  });

  it("filters rows by text query including alias-only matches", () => {
    const sessions = [
      mkSession({ sessionId: "11111111-1111-4111-8111-111111111111", name: "A" }),
      mkSession({ sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "B" }),
    ];
    const filtered = filterSessionsByTextQ(sessions, "pinned", annotations);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.sessionId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("filters starred-only sessions", () => {
    const sessions = [
      mkSession({ sessionId: "11111111-1111-4111-8111-111111111111" }),
      mkSession({ sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    ];
    const starred = filterSessionsStarredOnly(sessions, true, annotations);
    expect(starred).toHaveLength(1);
    expect(starred[0]?.sessionId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
