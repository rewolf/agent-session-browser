import { describe, expect, it } from "vitest";
import type { BrowserData, Session, SessionProvider } from "@asb/core";
import { ProviderRegistry } from "@asb/core";
import { scopeBrowserData } from "./browser-scope.js";

function stubProvider(id: "cursor" | "claude"): SessionProvider {
  return {
    id,
    displayName: id,
    workspaceGrouping: "fs-path",
    scanSessions: async () => ({ sessions: [] }),
    findTranscriptFile: () => null,
    listTranscriptFiles: () => [],
    loadConversation: async () => null,
    formatResumeCommandTail: () => "",
    metadataKeys: () => [],
  };
}

const registry = new ProviderRegistry([
  stubProvider("cursor"),
  stubProvider("claude"),
]);

function session(
  id: string,
  workspace: string,
  source: "cursor" | "claude"
): Session {
  return {
    sessionId: id,
    workspacePath: workspace,
    workspaceLeaf: workspace.split("/").pop()!,
    workspaceRoots: [workspace],
    createdAt: 1,
    updatedAt: 2,
    source,
  };
}

describe("scopeBrowserData", () => {
  const data: BrowserData = {
    sessions: [
      session("c1", "/ws/cursor-only", "cursor"),
      session("a1", "/ws/claude-only", "claude"),
    ],
    workspaces: ["/ws/cursor-only", "/ws/claude-only"],
    navTree: {
      label: "/",
      pathPrefix: "/",
      children: [],
      workspaceRootsHere: [],
    },
    unavailable: [],
  };

  it("keeps both sources for all", () => {
    const scoped = scopeBrowserData(data, "all", registry);
    expect(scoped.sessions).toHaveLength(2);
    expect(scoped.workspaces).toHaveLength(2);
  });

  it("filters sessions and workspaces for cursor", () => {
    const scoped = scopeBrowserData(data, "cursor", registry);
    expect(scoped.sessions.map((s) => s.sessionId)).toEqual(["c1"]);
    expect(scoped.workspaces).toEqual(["/ws/cursor-only"]);
    expect(scoped.navTree).not.toBeNull();
  });

  it("filters sessions and workspaces for claude", () => {
    const scoped = scopeBrowserData(data, "claude", registry);
    expect(scoped.sessions.map((s) => s.sessionId)).toEqual(["a1"]);
    expect(scoped.workspaces).toEqual(["/ws/claude-only"]);
  });
});
