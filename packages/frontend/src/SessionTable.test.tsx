/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionTable } from "./SessionTable";
import { METADATA_COLUMN_STORAGE_KEY } from "./columnVisibility";
import { MetadataFilterChips } from "./MetadataFilterChips";
import type { ProviderDescriptor } from "./api";
import type { ApiSession } from "./types";
import React from "react";

const providers = new Map<string, ProviderDescriptor>([
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
  [
    "claude",
    {
      id: "claude",
      displayName: "Claude Code",
      metadataKeys: [{ key: "gitBranch", label: "Git branch", kind: "text" }],
      workspaceGrouping: "fs-path",
      healthStatus: { ok: true },
    },
  ],
]);

vi.mock("./providersContext", () => ({
  useProvider: (id: string) => providers.get(id),
}));

function mkSession(overrides: Partial<ApiSession>): ApiSession {
  const now = Date.now();
  return {
    sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    source: "amp",
    resumeCommand: "amp resume x",
    primaryActions: [{ id: "resume", label: "Resume", command: "amp resume x" }],
    name: "Amp test",
    workspacePath: "/ws/amp",
    workspaceLeaf: "amp",
    workspaceRoots: ["/ws/amp"],
    createdAt: now,
    updatedAt: now,
    createdAtIso: new Date(now).toISOString(),
    updatedAtIso: new Date(now).toISOString(),
    metadata: null,
    ...overrides,
  };
}

function getTable() {
  return document.querySelector(".session-table") as HTMLTableElement;
}

function metadataHeader(table: HTMLTableElement) {
  return within(table).queryByRole("columnheader", { name: "Metadata" });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function tableProps(overrides: Partial<React.ComponentProps<typeof SessionTable>> = {}) {
  return {
    data: [mkSession({ metadata: { threadId: "T-abc123" } })],
    loading: false,
    annotations: {},
    onToggleBookmark: vi.fn(),
    onAliasChange: vi.fn(),
    bookmarkSortEnabled: true,
    ...overrides,
  };
}

describe("SessionTable metadata column visibility", () => {
  it("renders without Metadata column when localStorage is empty", () => {
    render(<SessionTable {...tableProps()} />);
    const table = getTable();
    expect(metadataHeader(table)).toBeNull();
    expect(screen.queryByText("T-abc123")).toBeNull();
  });

  it("renders Metadata column when localStorage is show", () => {
    localStorage.setItem(METADATA_COLUMN_STORAGE_KEY, "show");
    render(<SessionTable {...tableProps()} />);
    const table = getTable();
    expect(metadataHeader(table)).toBeTruthy();
    expect(screen.getByText("T-abc123")).toBeTruthy();
  });

  it("toggles Metadata column and persists preference", async () => {
    const user = userEvent.setup();
    render(<SessionTable {...tableProps()} />);
    const table = getTable();
    expect(metadataHeader(table)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Column visibility" }));
    const checkbox = screen.getByRole("checkbox", { name: /metadata/i });
    await user.click(checkbox);
    expect(metadataHeader(table)).toBeTruthy();
    expect(localStorage.getItem(METADATA_COLUMN_STORAGE_KEY)).toBe("show");

    await user.click(checkbox);
    expect(metadataHeader(table)).toBeNull();
    expect(localStorage.getItem(METADATA_COLUMN_STORAGE_KEY)).toBe("hide");
  });
});

describe("SessionTable metadata column", () => {
  it("renders descriptor-driven metadata chips for custom providers", () => {
    localStorage.setItem(METADATA_COLUMN_STORAGE_KEY, "show");
    render(<SessionTable {...tableProps()} />);
    const chip = screen.getByText("T-abc123");
    expect(chip.getAttribute("title")).toBe("Thread ID: T-abc123");
  });

  it("keeps muted dash empty-state when no metadata chips are produced", () => {
    localStorage.setItem(METADATA_COLUMN_STORAGE_KEY, "show");
    render(
      <SessionTable
        {...tableProps({
          data: [mkSession({ metadata: { threadId: "" } })],
        })}
      />
    );
    expect(screen.getByText("—")).toBeTruthy();
  });
});

function matchesMetadataFilter(
  session: ApiSession,
  filter: Record<string, string>
): boolean {
  for (const [key, value] of Object.entries(filter)) {
    const raw = session.metadata?.[key];
    if (raw == null || String(raw) !== value) {
      return false;
    }
  }
  return true;
}

function MetadataFilterTableHarness({
  sessions,
}: {
  sessions: ApiSession[];
}) {
  const [metadataFilter, setMetadataFilter] = React.useState<
    Record<string, string>
  >({});
  const filtered = React.useMemo(
    () => sessions.filter((s) => matchesMetadataFilter(s, metadataFilter)),
    [sessions, metadataFilter]
  );
  return (
    <>
      <MetadataFilterChips
        metadataKeys={[{ key: "gitBranch", label: "Git branch", kind: "text" }]}
        values={metadataFilter}
        onChange={setMetadataFilter}
      />
      <SessionTable
        data={filtered}
        loading={false}
        annotations={{}}
        onToggleBookmark={vi.fn()}
        onAliasChange={vi.fn()}
        bookmarkSortEnabled={true}
      />
    </>
  );
}

describe("MetadataFilterChips with hidden metadata column", () => {
  it("narrows visible rows when a metadata filter is applied", async () => {
    const user = userEvent.setup();
    const sessions = [
      mkSession({
        sessionId: "11111111-1111-4111-8111-111111111111",
        source: "claude",
        name: "main branch",
        metadata: { gitBranch: "main" },
      }),
      mkSession({
        sessionId: "22222222-2222-4222-8222-222222222222",
        source: "claude",
        name: "dev branch",
        metadata: { gitBranch: "dev" },
      }),
    ];
    render(<MetadataFilterTableHarness sessions={sessions} />);

    const table = getTable();
    expect(metadataHeader(table)).toBeNull();
    expect(screen.getByText("main branch")).toBeTruthy();
    expect(screen.getByText("dev branch")).toBeTruthy();

    const input = screen.getByPlaceholderText("Git branch");
    await user.type(input, "main");

    expect(screen.getByText("main branch")).toBeTruthy();
    expect(screen.queryByText("dev branch")).toBeNull();
    expect(metadataHeader(table)).toBeNull();
  });
});

describe("SessionTable bookmarks and aliases", () => {
  it("toggles bookmark via star button", async () => {
    const user = userEvent.setup();
    const onToggleBookmark = vi.fn();
    render(
      <SessionTable
        {...tableProps({
          onToggleBookmark,
          data: [mkSession({ source: "cursor", sessionId: "sess-1" })],
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: "Bookmark session" }));
    expect(onToggleBookmark).toHaveBeenCalledWith("cursor", "sess-1");
  });

  it("shows filled star for bookmarked sessions", () => {
    render(
      <SessionTable
        {...tableProps({
          data: [mkSession({ source: "cursor", sessionId: "sess-1" })],
          annotations: { "cursor:sess-1": { bookmarked: true } },
        })}
      />
    );
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toBeTruthy();
  });

  it("renders alias with original name and saves on enter", async () => {
    const user = userEvent.setup();
    const onAliasChange = vi.fn();
    render(
      <SessionTable
        {...tableProps({
          onAliasChange,
          data: [
            mkSession({
              source: "cursor",
              sessionId: "sess-1",
              name: "Provider name",
            }),
          ],
          annotations: { "cursor:sess-1": { alias: "My alias" } },
        })}
      />
    );

    expect(screen.getByText(/My alias \(Provider name\)/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit alias" }));
    const input = screen.getByRole("textbox", { name: "Session alias" });
    await user.clear(input);
    await user.type(input, "Updated alias{Enter}");
    expect(onAliasChange).toHaveBeenCalledWith("cursor", "sess-1", "Updated alias");
  });

  it("cancels alias edit on Escape without saving", async () => {
    const user = userEvent.setup();
    const onAliasChange = vi.fn();
    render(
      <SessionTable
        {...tableProps({
          onAliasChange,
          data: [
            mkSession({
              source: "cursor",
              sessionId: "sess-1",
              name: "Provider name",
            }),
          ],
          annotations: { "cursor:sess-1": { alias: "My alias" } },
        })}
      />
    );

    expect(screen.getByText(/My alias \(Provider name\)/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit alias" }));
    const input = screen.getByRole("textbox", { name: "Session alias" });
    await user.clear(input);
    await user.type(input, "Discarded change");
    await user.keyboard("{Escape}");

    expect(onAliasChange).not.toHaveBeenCalled();
    expect(screen.getByText(/My alias \(Provider name\)/)).toBeTruthy();
  });

  it("shows muted no-name when neither alias nor provider name exist", () => {
    render(
      <SessionTable
        {...tableProps({
          data: [mkSession({ source: "cursor", sessionId: "sess-1", name: null })],
        })}
      />
    );
    expect(screen.getByText("(no name)")).toBeTruthy();
  });
});

describe("SessionTable excerpt sub-row", () => {
  it("renders excerpt sub-row when excerpt is present", () => {
    render(
      <SessionTable
        {...tableProps({
          data: [
            mkSession({
              source: "cursor",
              sessionId: "sess-excerpt",
              name: "Composer title",
              excerpt: "Help me refactor the session table layout",
            }),
          ],
        })}
      />
    );
    const excerpt = screen.getByText("Help me refactor the session table layout");
    expect(excerpt.className).toContain("session-excerpt");
    expect(document.querySelector(".session-excerpt-row")).toBeTruthy();
    expect(document.querySelector(".session-row--has-excerpt")).toBeTruthy();
  });

  it("omits excerpt sub-row when excerpt is null", () => {
    render(
      <SessionTable
        {...tableProps({
          data: [
            mkSession({
              source: "cursor",
              sessionId: "sess-no-excerpt",
              excerpt: null,
            }),
          ],
        })}
      />
    );
    expect(document.querySelector(".session-excerpt-row")).toBeNull();
    expect(document.querySelector(".session-row--has-excerpt")).toBeNull();
  });
});
