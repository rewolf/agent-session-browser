import { describe, expect, it } from "vitest";
import {
  buildFlatNavTree,
  buildExternalIdNavTree,
  buildGroupedNavTree,
  buildNavTreeForSessions,
} from "./nav-tree.js";
import { ProviderRegistry } from "./provider.js";
import type { Session, SessionSource } from "./types.js";
import { ExternalIdFakeProvider, FlatFakeProvider } from "./test-fakes.js";
import { asPosixPath } from "./test-path.js";

function session(
  source: SessionSource,
  overrides: Partial<Session> = {}
): Session {
  return {
    sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspacePath: "/home/proj",
    workspaceLeaf: "proj",
    workspaceRoots: ["/home/proj"],
    createdAt: 1,
    updatedAt: 2,
    source,
    ...overrides,
  };
}

describe("buildFlatNavTree", () => {
  it("renders flat children without path hierarchy", async () => {
    const p = new FlatFakeProvider();
    const { sessions } = await p.scanSessions();
    const tree = buildFlatNavTree(sessions);
    expect(tree?.children).toHaveLength(2);
    expect(tree?.children.every((c) => c.children.length === 0)).toBe(true);
    expect(
      tree?.children.map((c) => asPosixPath(c.workspaceRootsHere[0]!)).sort()
    ).toEqual(["/flat/one", "/flat/two"]);
  });
});

describe("buildExternalIdNavTree", () => {
  it("groups by metadata.workspaceKey", async () => {
    const p = new ExternalIdFakeProvider();
    const { sessions } = await p.scanSessions();
    const tree = buildExternalIdNavTree(sessions);
    const labels = tree?.children.map((c) => c.label).sort();
    expect(labels).toEqual(["team-alpha", "team-beta"]);
  });
});

describe("buildNavTreeForSessions mixed grouping", () => {
  it("combines fs-path and external-id provider trees", async () => {
    const ext = new ExternalIdFakeProvider();
    const { sessions: extSessions } = await ext.scanSessions();
    const fsSessions = [
      session("cursor", { workspacePath: "/home/a/x", workspaceRoots: ["/home/a/x"] }),
    ];
    const fsStub = {
      id: "cursor" as SessionSource,
      displayName: "Cursor",
      workspaceGrouping: "fs-path" as const,
      scanSessions: async () => ({ sessions: fsSessions }),
      findTranscriptFile: () => null,
      listTranscriptFiles: () => [],
      loadConversation: async () => null,
      formatResumeCommandTail: () => "",
      metadataKeys: () => [],
    };
    const registry = new ProviderRegistry([fsStub, ext]);
    const tree = buildNavTreeForSessions(
      [...fsSessions, ...extSessions],
      registry
    );
    expect(tree?.label).toBe("Sources");
    expect(tree?.children.length).toBeGreaterThanOrEqual(2);
  });

  it("buildGroupedNavTree none matches flat", async () => {
    const p = new FlatFakeProvider();
    const { sessions } = await p.scanSessions();
    expect(buildGroupedNavTree(sessions, "none")).toEqual(
      buildFlatNavTree(sessions)
    );
  });

  it("buildGroupedNavTree external-id matches external tree", async () => {
    const p = new ExternalIdFakeProvider();
    const { sessions } = await p.scanSessions();
    expect(buildGroupedNavTree(sessions, "external-id")).toEqual(
      buildExternalIdNavTree(sessions)
    );
  });
});
