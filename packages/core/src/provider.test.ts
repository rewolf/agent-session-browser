import { describe, expect, it } from "vitest";
import type { Session, SessionSource } from "./types.js";
import {
  ProviderRegistry,
  type SessionProvider,
  type TranscriptFileRef,
} from "./provider.js";
import { createDefaultProviders } from "./provider-defaults.js";
import { shellQuoteToken } from "./resume-command.js";
import type { TranscriptConversation } from "./transcript-conversation.js";

/** Hypothetical third source (union widened in a follow-up ticket). */
const AMP_SOURCE = "amp" as SessionSource;

const ampSession: Session = {
  sessionId: "amp-0000-0000-0000-000000000001",
  workspacePath: "/amp/workspace",
  workspaceLeaf: "workspace",
  workspaceRoots: ["/amp/workspace"],
  createdAt: 1,
  updatedAt: 2,
  source: AMP_SOURCE,
};

class AmpStubSessionProvider implements SessionProvider {
  readonly id = AMP_SOURCE;
  readonly displayName = "Amp (stub)";
  readonly workspaceGrouping = "fs-path" as const;

  async scanSessions() {
    return { sessions: [{ ...ampSession }] };
  }

  findTranscriptFile(): TranscriptFileRef | null {
    return null;
  }

  listTranscriptFiles(): TranscriptFileRef[] {
    return [];
  }

  async loadConversation(): Promise<TranscriptConversation | null> {
    return null;
  }

  formatResumeCommandTail(session: Session): string {
    return `amp resume ${session.sessionId}`;
  }

  metadataKeys() {
    return [];
  }
}

async function loadSessionsFromRegistry(
  registry: ProviderRegistry
): Promise<Session[]> {
  const out: Session[] = [];
  for (const p of registry.all()) {
    const result = await p.scanSessions();
    out.push(...result.sessions);
  }
  return out;
}

describe("ProviderRegistry", () => {
  it("returns all registered providers", () => {
    const registry = new ProviderRegistry(createDefaultProviders());
    const ids = registry.all().map((p) => p.id).sort();
    expect(ids).toEqual(["claude", "cursor"]);
  });

  it("get(unknown) returns undefined", () => {
    const registry = new ProviderRegistry(createDefaultProviders());
    expect(registry.get("cursor")).toBeDefined();
    expect(registry.get("claude")).toBeDefined();
    expect(
      registry.get("nonexistent" as SessionSource)
    ).toBeUndefined();
  });

  it("providers retain declared id and displayName", () => {
    const registry = new ProviderRegistry(createDefaultProviders());
    for (const p of registry.all()) {
      expect(p.id).toBeTruthy();
      expect(p.displayName.length).toBeGreaterThan(0);
      expect(registry.get(p.id)?.id).toBe(p.id);
    }
  });

  it("metadataKeys returns Claude descriptors and empty for Cursor", () => {
    const registry = new ProviderRegistry(createDefaultProviders());
    const byId = Object.fromEntries(
      registry.all().map((p) => [p.id, p.metadataKeys()])
    );
    expect(byId.cursor).toEqual([]);
    expect(byId.claude?.map((d) => d.key).sort()).toEqual([
      "cliVersion",
      "gitBranch",
      "hasSidechains",
      "permissionMode",
    ]);
  });
});

describe("ProviderRegistry with hypothetical third provider", () => {
  it("registers amp stub for scan, source filter, and resume tail without dispatcher edits", async () => {
    const amp = new AmpStubSessionProvider();
    const registry = new ProviderRegistry([
      ...createDefaultProviders(),
      amp,
    ]);

    const merged = await loadSessionsFromRegistry(registry);
    expect(merged.some((s) => s.sessionId === ampSession.sessionId)).toBe(
      true
    );

    const bySource = merged.filter((s) => s.source === AMP_SOURCE);
    expect(bySource).toHaveLength(1);

    const provider = registry.get(AMP_SOURCE)!;
    const dir = shellQuoteToken(ampSession.workspacePath);
    const tail = provider.formatResumeCommandTail(ampSession);
    expect(`cd ${dir} && ${tail}`).toBe(
      "cd /amp/workspace && amp resume amp-0000-0000-0000-000000000001"
    );
  });
});
