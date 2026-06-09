import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, SessionSource } from "./types.js";
import { type SessionProvider } from "./provider.js";
import {
  commandPrimaryAction,
  resolvePrimaryActions,
} from "./primary-actions.js";
import { withScanCache } from "./scan-cache.js";
import { providerToDescriptor } from "./provider-descriptor.js";
import { shellQuoteToken } from "./resume-command.js";
import { FailingFakeProvider } from "./test-fakes.js";

const FAKE_ACTIONS = "fake-actions" as SessionSource;

function baseSession(source: SessionSource, extra?: Partial<Session>): Session {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    workspacePath: "/ws/a",
    workspaceLeaf: "a",
    workspaceRoots: ["/ws/a"],
    createdAt: 1,
    updatedAt: 2,
    source,
    ...extra,
  };
}

class ResumeNameOnlyProvider implements SessionProvider {
  readonly id = FAKE_ACTIONS;
  readonly displayName = "Actions Fake";
  readonly workspaceGrouping = "fs-path" as const;
  readonly resumeCommandName = "mycli";

  async scanSessions() {
    return { sessions: [baseSession(FAKE_ACTIONS)] };
  }

  findTranscriptFile() {
    return null;
  }
  listTranscriptFiles() {
    return [];
  }
  async loadConversation() {
    return null;
  }
  formatResumeCommandTail(s: Session) {
    return `mycli --resume ${shellQuoteToken(s.sessionId)}`;
  }
  metadataKeys() {
    return [];
  }
}

class DualActionProvider implements SessionProvider {
  readonly id = "fake-dual" as SessionSource;
  readonly displayName = "Dual Action";
  readonly workspaceGrouping = "fs-path" as const;

  async scanSessions() {
    return { sessions: [baseSession("fake-dual" as SessionSource)] };
  }

  primaryActions() {
    return [
      { id: "open", label: "Open", url: "https://example.com/s" },
      { id: "resume", label: "Resume", command: "cd /ws/a && tool run" },
    ];
  }

  findTranscriptFile() {
    return null;
  }
  listTranscriptFiles() {
    return [];
  }
  async loadConversation() {
    return null;
  }
  formatResumeCommandTail() {
    return "tool run";
  }
  metadataKeys() {
    return [];
  }
}

describe("FailingFakeProvider", () => {
  it("reports unavailable and unhealthy descriptor", async () => {
    const p = new FailingFakeProvider();
    const scan = await p.scanSessions();
    expect(scan.sessions).toEqual([]);
    expect(scan.unavailable?.reason).toBe("auth");

    const desc = await providerToDescriptor(p);
    expect(desc.healthStatus.ok).toBe(false);
    if (!desc.healthStatus.ok) {
      expect(desc.healthStatus.reason).toBe("auth");
    }
  });
});

describe("primaryActions default wrapping", () => {
  it("wraps resumeCommandName-only provider as single command action", () => {
    const p = new ResumeNameOnlyProvider();
    const s = baseSession(FAKE_ACTIONS);
    const actions = resolvePrimaryActions(p, s);
    expect(actions).toHaveLength(1);
    expect(actions[0]!.id).toBe("resume");
    expect(actions[0]!.command).toContain("mycli --resume");
  });
});

describe("commandPrimaryAction", () => {
  it("selects command-bearing entry when url action is also present", () => {
    const p = new DualActionProvider();
    const s = baseSession("fake-dual" as SessionSource);
    const action = commandPrimaryAction(p, s);
    expect(action?.command).toBe("cd /ws/a && tool run");
    expect(action?.url).toBeUndefined();
  });
});

describe("withScanCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls underlying scan once within TTL for multiple callers", async () => {
    let calls = 0;
    const inner: SessionProvider = {
      id: "cached",
      displayName: "Cached",
      workspaceGrouping: "none",
      async scanSessions() {
        calls++;
        return { sessions: [] };
      },
      findTranscriptFile: () => null,
      listTranscriptFiles: () => [],
      loadConversation: async () => null,
      formatResumeCommandTail: () => "",
      metadataKeys: () => [],
    };
    const wrapped = withScanCache(inner, 5000);
    await Promise.all([
      wrapped.scanSessions(),
      wrapped.scanSessions(),
      wrapped.scanSessions(),
    ]);
    expect(calls).toBe(1);

    vi.advanceTimersByTime(5001);
    await wrapped.scanSessions();
    expect(calls).toBe(2);
  });
});
