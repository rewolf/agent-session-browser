/** @vitest-environment node */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, TranscriptConversation } from "@asb/core";
import { defaultProviderRegistry } from "@asb/core";

const { loadBrowserData, loadSessionConversationBySource } = vi.hoisted(() => ({
  loadBrowserData: vi.fn(),
  loadSessionConversationBySource: vi.fn(),
}));

vi.mock("@asb/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@asb/core")>();
  return {
    ...actual,
    loadBrowserData,
    loadSessionConversationBySource,
  };
});

import { createServer } from "./server.js";

const UNKNOWN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CLAUDE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

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

describe("GET /api/sessions/:sessionId/conversation", () => {
  beforeEach(() => {
    loadBrowserData.mockResolvedValue({
      sessions: [] as Session[],
      workspaces: [],
      navTree: null,
      unavailable: [],
    });
    loadSessionConversationBySource.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when source cannot be resolved", async () => {
    const { status, body } = await getJson(
      `/api/sessions/${UNKNOWN_ID}/conversation`
    );
    expect(status).toBe(400);
    expect(body.error).toMatch(/Cannot determine session source/);
    expect(loadSessionConversationBySource).not.toHaveBeenCalled();
  });

  it("loads conversation when source is explicit", async () => {
    const conversation: TranscriptConversation = {
      sessionId: CLAUDE_ID,
      jsonlPath: "/tmp/claude.jsonl",
      workspacePath: "/ws/claude",
      workspaceLeaf: "claude",
      messages: [],
    };
    loadSessionConversationBySource.mockResolvedValue(conversation);

    const { status, body } = await getJson(
      `/api/sessions/${CLAUDE_ID}/conversation?source=claude`
    );
    expect(status).toBe(200);
    expect(body.sessionId).toBe(CLAUDE_ID);
    expect(loadSessionConversationBySource).toHaveBeenCalledWith(
      CLAUDE_ID,
      "claude",
      expect.anything()
    );
  });
});
