import { describe, expect, it, vi } from "vitest";
import type { Session, SessionProvider } from "@asb/core";
import { ProviderRegistry, commandPrimaryAction } from "@asb/core";
import { runProvidersCommand } from "./providers-cmd.js";
import { runListSessions } from "./list-sessions.js";

class FailingFakeProvider implements SessionProvider {
  readonly id = "fake-fail";
  readonly displayName = "Failing Fake";
  readonly workspaceGrouping = "none" as const;

  async scanSessions() {
    return {
      sessions: [] as Session[],
      unavailable: {
        reason: "auth" as const,
        message: "token expired",
      },
    };
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
    return "";
  }
  metadataKeys() {
    return [];
  }
}

class DualActionProvider implements SessionProvider {
  readonly id = "fake-dual";
  readonly displayName = "Dual";
  readonly workspaceGrouping = "fs-path" as const;

  async scanSessions() {
    return {
      sessions: [
        {
          sessionId: "55555555-5555-4555-8555-555555555555",
          workspacePath: "/ws",
          workspaceLeaf: "ws",
          workspaceRoots: ["/ws"],
          createdAt: 1,
          updatedAt: 2,
          source: "fake-dual",
        },
      ],
    };
  }

  primaryActions() {
    return [
      { id: "open", label: "Open", url: "https://example.com" },
      { id: "resume", label: "Resume", command: "cd /ws && tool run id" },
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
    return "tool run id";
  }
  metadataKeys() {
    return [];
  }
}

describe("runProvidersCommand", () => {
  it("prints health and workspace-grouping columns", async () => {
    const registry = new ProviderRegistry([
      new FailingFakeProvider(),
      new DualActionProvider(),
    ]);
    const lines: string[] = [];
    const log = vi.spyOn(console, "log").mockImplementation((...args) => {
      lines.push(args.map(String).join("\t"));
    });
    await runProvidersCommand(registry, false);
    log.mockRestore();
    expect(lines[0]).toContain("workspace-grouping");
    expect(lines.some((l) => l.includes("fake-fail"))).toBe(true);
    expect(lines.some((l) => l.includes("none"))).toBe(true);
    expect(lines.some((l) => l.includes("fs-path"))).toBe(true);
  });
});

describe("runListSessions unavailable", () => {
  it("writes warning to stderr and exits non-zero when all requested fail", async () => {
    const registry = new ProviderRegistry([new FailingFakeProvider()]);
    const errLines: string[] = [];
    const err = vi.spyOn(console, "error").mockImplementation((msg: string) => {
      errLines.push(msg);
    });
    const code = await runListSessions(registry, {
      workspaceArg: undefined,
      sourceFilter: "fake-fail",
    });
    err.mockRestore();
    expect(errLines.some((l) => l.includes("fake-fail unavailable"))).toBe(true);
    expect(code).toBe(1);
  });
});

describe("commandPrimaryAction", () => {
  it("picks command action over url for dual provider", () => {
    const p = new DualActionProvider();
    const s = {
      sessionId: "55555555-5555-4555-8555-555555555555",
      workspacePath: "/ws",
      workspaceLeaf: "ws",
      workspaceRoots: ["/ws"],
      createdAt: 1,
      updatedAt: 2,
      source: "fake-dual" as const,
    };
    expect(commandPrimaryAction(p, s)?.command).toBe("cd /ws && tool run id");
  });
});
