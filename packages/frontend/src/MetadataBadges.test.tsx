import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetadataBadges } from "./MetadataBadges";
import type { ProviderDescriptor } from "./api";

const providers = new Map<string, ProviderDescriptor>([
  [
    "claude",
    {
      id: "claude",
      displayName: "Claude Code",
      metadataKeys: [
        { key: "gitBranch", label: "Git branch", kind: "text" },
        { key: "permissionMode", label: "Permission mode", kind: "text" },
        { key: "hasSidechains", label: "Has subagents", kind: "boolean" },
      ],
      workspaceGrouping: "fs-path",
      healthStatus: { ok: true },
    },
  ],
  [
    "amp",
    {
      id: "amp",
      displayName: "Amp",
      metadataKeys: [{ key: "threadId", label: "Thread ID", kind: "text" }],
      workspaceGrouping: "fs-path",
      healthStatus: { ok: true },
    },
  ],
]);

vi.mock("./providersContext", () => ({
  useProvider: (id: string) => providers.get(id),
}));

describe("MetadataBadges", () => {
  it("renders branch, mode, and sidechain badges", () => {
    render(
      <MetadataBadges
        source="claude"
        metadata={{
          gitBranch: "main",
          permissionMode: "plan",
          hasSidechains: "true",
        }}
      />
    );
    expect(screen.getByText("main")).toBeTruthy();
    expect(screen.getByText("plan")).toBeTruthy();
    expect(screen.getByText("Has subagents")).toBeTruthy();
  });

  it("shows em dash when meta is empty", () => {
    render(<MetadataBadges source="claude" metadata={null} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders descriptor-driven text metadata for non-claude providers", () => {
    render(
      <MetadataBadges source="amp" metadata={{ threadId: "T-abc123" }} />
    );
    const chip = screen.getByText("T-abc123");
    expect(chip).toBeTruthy();
    expect(chip.getAttribute("title")).toBe("Thread ID: T-abc123");
  });

  it("shows em dash when no descriptors produce a badge", () => {
    render(
      <MetadataBadges
        source="amp"
        metadata={{ threadId: "", hasSidechains: "false" }}
      />
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
