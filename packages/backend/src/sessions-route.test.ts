/** @vitest-environment node */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@asb/core";
import { defaultProviderRegistry } from "@asb/core";

const { loadBrowserData } = vi.hoisted(() => ({
  loadBrowserData: vi.fn(),
}));

vi.mock("@asb/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@asb/core")>();
  return {
    ...actual,
    loadBrowserData,
  };
});

import { createServer } from "./server.js";

const CURSOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLAUDE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function session(
  overrides: Partial<Session> & Pick<Session, "sessionId" | "source">
): Session {
  return {
    name: "demo",
    workspacePath: "/ws/demo",
    workspaceLeaf: "demo",
    workspaceRoots: ["/ws/demo"],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function getJson(
  path: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const app = createServer(defaultProviderRegistry());
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      fetch(`http://127.0.0.1:${port}${path}`)
        .then(async (res) => {
          const body = (await res.json()) as Record<string, unknown>;
          resolve({ status: res.status, body });
          server.close();
        })
        .catch((e) => {
          server.close();
          reject(e);
        });
    });
  });
}

describe("GET /api/sessions", () => {
  beforeEach(() => {
    loadBrowserData.mockResolvedValue({
      sessions: [
        session({ sessionId: CURSOR_ID, source: "cursor" }),
        session({ sessionId: CLAUDE_ID, source: "claude" }),
      ],
      workspaces: ["/ws/demo"],
      navTree: null,
      unavailable: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes resumeCommand per session for cursor and claude", async () => {
    const { status, body } = await getJson("/api/sessions");
    expect(status).toBe(200);
    const rows = body.sessions as Array<{
      sessionId: string;
      source: string;
      resumeCommand: string;
    }>;
    const cursor = rows.find((r) => r.sessionId === CURSOR_ID);
    const claude = rows.find((r) => r.sessionId === CLAUDE_ID);
    expect(cursor?.resumeCommand).toBe(
      `cd /ws/demo && agent --resume=${CURSOR_ID}`
    );
    expect(claude?.resumeCommand).toBe(
      `cd /ws/demo && claude --resume ${CLAUDE_ID}`
    );
  });
});
