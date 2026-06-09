import { describe, expect, it } from "vitest";
import { defaultProviderRegistry } from "./provider-defaults.js";
import type { Session, SessionSource } from "./types.js";
import { dedupeSessionsByNewestUpdated, filterSessions } from "./session-filters.js";

const registry = defaultProviderRegistry();

const fixtures: Session[] = [
  {
    sessionId: "abc-1",
    name: "Hello World",
    workspacePath: "/w/a",
    workspaceLeaf: "a",
    workspaceRoots: ["/w/a"],
    createdAt: 1000,
    updatedAt: 2000,
    source: "cursor",
  },
  {
    sessionId: "xyz-9",
    workspacePath: "/w/b",
    workspaceLeaf: "b",
    workspaceRoots: ["/w/b"],
    createdAt: 5000,
    updatedAt: 6000,
    source: "claude",
    metadata: {
      gitBranch: "main",
      permissionMode: "plan",
      hasSidechains: "true",
    },
  },
  {
    sessionId: "amp-1",
    workspacePath: "/w/c",
    workspaceLeaf: "c",
    workspaceRoots: ["/w/c"],
    createdAt: 7000,
    updatedAt: 8000,
    source: "cursor",
    metadata: {
      customKey: "customValue",
    },
  },
];

describe("dedupeSessionsByNewestUpdated", () => {
  it("keeps one row per sessionId (newest updatedAt)", () => {
    const rows: Session[] = [
      { ...fixtures[0]!, sessionId: "dup", updatedAt: 100 },
      { ...fixtures[0]!, sessionId: "dup", updatedAt: 300 },
    ];
    expect(dedupeSessionsByNewestUpdated(rows)).toHaveLength(1);
    expect(dedupeSessionsByNewestUpdated(rows)[0]!.updatedAt).toBe(300);
  });
});

describe("filterSessions", () => {
  it("filters by nameOrId", () => {
    expect(
      filterSessions(fixtures, { nameOrId: "hello" }, registry)
    ).toHaveLength(1);
    expect(
      filterSessions(fixtures, { nameOrId: "xyz" }, registry)
    ).toHaveLength(1);
  });

  it("filters by created range", () => {
    expect(
      filterSessions(fixtures, { createdAfter: 3000 }, registry)
    ).toHaveLength(2);
    expect(
      filterSessions(fixtures, { createdBefore: 3000 }, registry)
    ).toHaveLength(1);
  });

  it("filters by source", () => {
    expect(
      filterSessions(fixtures, { source: "cursor" }, registry)
    ).toHaveLength(2);
    expect(
      filterSessions(fixtures, { source: "cursor" }, registry).map(
        (s) => s.sessionId
      )
    ).toContain("abc-1");
    expect(
      filterSessions(fixtures, { source: "claude" }, registry)
    ).toHaveLength(1);
    expect(
      filterSessions(fixtures, { source: "claude" }, registry)[0]!.sessionId
    ).toBe("xyz-9");
  });

  it("returns empty when source is not in registry", () => {
    expect(
      filterSessions(
        fixtures,
        { source: "made-up" as SessionSource },
        registry
      )
    ).toEqual([]);
  });

  it("filters by metadataFilter regardless of source", () => {
    expect(
      filterSessions(
        fixtures,
        { metadataFilter: { gitBranch: "main" } },
        registry
      )
    ).toHaveLength(1);
    expect(
      filterSessions(
        fixtures,
        { metadataFilter: { gitBranch: "dev" } },
        registry
      )
    ).toHaveLength(0);
    expect(
      filterSessions(
        fixtures,
        { metadataFilter: { permissionMode: "plan" } },
        registry
      )
    ).toHaveLength(1);
    expect(
      filterSessions(
        fixtures,
        {
          metadataFilter: { permissionMode: "acceptEdits" },
        },
        registry
      )
    ).toHaveLength(0);
    expect(
      filterSessions(
        fixtures,
        {
          metadataFilter: { customKey: "customValue" },
        },
        registry
      )
    ).toHaveLength(1);
    expect(
      filterSessions(
        fixtures,
        { metadataFilter: { customKey: "other" } },
        registry
      )
    ).toHaveLength(0);
  });

  it("ANDs multiple metadataFilter keys", () => {
    expect(
      filterSessions(
        fixtures,
        {
          metadataFilter: { gitBranch: "main", permissionMode: "plan" },
        },
        registry
      )
    ).toHaveLength(1);
    expect(
      filterSessions(
        fixtures,
        {
          metadataFilter: { gitBranch: "main", permissionMode: "other" },
        },
        registry
      )
    ).toHaveLength(0);
  });
});
