/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceFilterControl } from "./SourceFilterControl";
import { ProvidersProvider } from "./providersContext";
import * as api from "./api";
import { vi } from "vitest";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchProviders: vi.fn(),
  };
});

const mockFetchProviders = vi.mocked(api.fetchProviders);

const healthy = { ok: true as const };

const threeProviders: api.ProviderDescriptor[] = [
  {
    id: "cursor",
    displayName: "Cursor",
    metadataKeys: [],
    workspaceGrouping: "fs-path",
    healthStatus: healthy,
  },
  {
    id: "claude",
    displayName: "Claude Code",
    metadataKeys: [{ key: "gitBranch", label: "Git branch", kind: "text" }],
    workspaceGrouping: "fs-path",
    healthStatus: healthy,
  },
  {
    id: "stub",
    displayName: "Test Stub",
    metadataKeys: [],
    workspaceGrouping: "none",
    healthStatus: healthy,
  },
];

function renderControl(
  value: "all" | string = "all",
  onChange = vi.fn()
) {
  return render(
    <ProvidersProvider>
      <SourceFilterControl value={value} onChange={onChange} />
    </ProvidersProvider>
  );
}

describe("SourceFilterControl", () => {
  afterEach(() => {
    cleanup();
    mockFetchProviders.mockReset();
  });

  it("renders All plus one button per provider descriptor", async () => {
    mockFetchProviders.mockResolvedValue(threeProviders);
    renderControl();

    expect(await screen.findByRole("button", { name: "All Agents" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cursor" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Claude Code" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Test Stub" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("calls onChange when a segment is clicked", async () => {
    mockFetchProviders.mockResolvedValue(threeProviders);
    const onChange = vi.fn();
    renderControl("all", onChange);
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "Claude Code" });
    await user.click(screen.getByRole("button", { name: "Claude Code" }));
    expect(onChange).toHaveBeenCalledWith("claude");
  });
});
