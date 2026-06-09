import { describe, expect, it } from "vitest";
import type { Session } from "./types.js";
import { defaultProviderRegistry } from "./provider-defaults.js";
import { formatResumeCommand } from "./resume-command.js";

const base: Omit<Session, "source" | "sessionId"> = {
  workspacePath: "/home/proj",
  workspaceLeaf: "proj",
  workspaceRoots: ["/home/proj"],
  createdAt: 1,
  updatedAt: 2,
};

describe("formatResumeCommand", () => {
  const registry = defaultProviderRegistry();

  it("emits agent --resume= for cursor sessions", () => {
    const cmd = formatResumeCommand({
      ...base,
      sessionId: "cur-1",
      source: "cursor",
    }, registry);
    expect(cmd).toBe("cd /home/proj && agent --resume=cur-1");
  });

  it("emits claude --resume for claude sessions", () => {
    const cmd = formatResumeCommand({
      ...base,
      sessionId: "claude-abc",
      source: "claude",
    }, registry);
    expect(cmd).toBe("cd /home/proj && claude --resume claude-abc");
  });

  it("quotes paths and ids with special characters", () => {
    const cmd = formatResumeCommand({
      ...base,
      workspacePath: "/my proj",
      workspaceRoots: ["/my proj"],
      sessionId: "id with space",
      source: "claude",
    }, registry);
    expect(cmd).toBe("cd '/my proj' && claude --resume 'id with space'");
  });

  it("throws Unknown session source for unregistered providers", () => {
    expect(() =>
      formatResumeCommand({
        ...base,
        sessionId: "x",
        source: "unknown-provider",
      }, registry)
    ).toThrow(/Unknown session source: unknown-provider/);
  });
});
