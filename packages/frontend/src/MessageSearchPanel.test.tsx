/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageSearchPanel } from "./MessageSearchPanel";
import { ProvidersProvider } from "./providersContext";
import { SessionFilterBar } from "./SessionFilterBar";
import * as api from "./api";
import { FILTER_DATE_MODE_STORAGE_KEY } from "./filterDateMode";
import { MSG_SEARCH_DATE_MODE_STORAGE_KEY } from "./msgSearchDateMode";
import type { TranscriptSearchHit } from "./types";

const sessionActionsSpy = vi.fn();

vi.mock("./SessionActionsCell", () => ({
  SessionActionsCell: (props: Record<string, unknown>) => {
    sessionActionsSpy(props);
    return <div data-testid="session-actions-mock" />;
  },
}));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    fetchTranscriptSearch: vi.fn(),
    fetchProviders: vi.fn().mockResolvedValue([
      {
        id: "cursor",
        displayName: "Cursor",
        resumeCommandName: "agent",
        metadataKeys: [],
        workspaceGrouping: "fs-path",
        healthStatus: { ok: true },
      },
      {
        id: "claude",
        displayName: "Claude Code",
        resumeCommandName: "claude",
        metadataKeys: [],
        workspaceGrouping: "fs-path",
        healthStatus: { ok: true },
      },
    ]),
  };
});

const mockSearch = vi.mocked(api.fetchTranscriptSearch);

const cursorHit: TranscriptSearchHit = {
  sessionId: "sess-cursor",
  source: "cursor",
  resumeCommand: "cd /proj && agent --resume=sess-cursor",
  sessionName: "Test",
  workspacePath: "/proj",
  workspaceLeaf: "proj",
  lineNumber: 42,
  preview: "cursor hit preview",
  transcriptPath: "/proj/sess.jsonl",
  role: "user",
  sortAt: 1_700_000_000_000,
  sortAtIso: "2023-11-14T22:13:20.000Z",
  timeSource: "message",
};

const sessionFilterBarProps = {
  workspaces: ["/home/dev/project"],
  workspaceFilter: "",
  onWorkspaceFilterChange: vi.fn(),
  textQ: "",
  onTextQChange: vi.fn(),
  dateField: "created" as const,
  onDateFieldToggle: vi.fn(),
  rangeFrom: "",
  onRangeFromChange: vi.fn(),
  rangeTo: "",
  onRangeToChange: vi.fn(),
  metadataKeys: [],
  metadataFilter: {},
  onMetadataFilterChange: vi.fn(),
  loading: false,
  refreshDisabled: true,
  onRefresh: vi.fn(),
};

function renderPanel(ui: React.ReactElement) {
  return render(<ProvidersProvider>{ui}</ProvidersProvider>);
}

function searchButton() {
  return screen.getByRole("button", {
    name: "Search transcripts",
  }) as HTMLButtonElement;
}

function dateModeToggle() {
  return screen.getByRole("button", {
    name: /Session dates filter applies to:/,
  });
}

describe("MessageSearchPanel source filter sync", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  beforeEach(() => {
    mockSearch.mockReset();
    sessionActionsSpy.mockClear();
  });

  it("clears stale hits and re-runs search when sourceFilter changes with an active query", async () => {
    const user = userEvent.setup();
    mockSearch
      .mockResolvedValueOnce({
        hits: [cursorHit],
        capped: false,
        limit: 200,
      })
      .mockResolvedValueOnce({
        hits: [],
        capped: false,
        limit: 200,
      });

    const { rerender } = renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    await user.type(
      screen.getByPlaceholderText(/substring in JSONL/i),
      "hello"
    );
    await user.click(searchButton());

    await waitFor(() => {
      expect(screen.getByText("cursor hit preview")).toBeTruthy();
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch.mock.calls[0]![0].source).toBe("all");

    rerender(
      <ProvidersProvider>
        <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="claude" />
      </ProvidersProvider>
    );

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
    expect(mockSearch.mock.calls[1]![0].source).toBe("claude");
    await waitFor(() => {
      expect(screen.queryByText("cursor hit preview")).toBeNull();
    });
  });

  it("clears results without re-search when sourceFilter changes and query is empty", async () => {
    mockSearch.mockResolvedValue({
      hits: [cursorHit],
      capped: false,
      limit: 200,
    });

    const user = userEvent.setup();
    const { rerender } = renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    await user.type(
      screen.getByPlaceholderText(/substring in JSONL/i),
      "hello"
    );
    await user.click(searchButton());
    await waitFor(() => {
      expect(screen.getByText("cursor hit preview")).toBeTruthy();
    });

    await user.clear(screen.getByPlaceholderText(/substring in JSONL/i));
    rerender(
      <ProvidersProvider>
        <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="claude" />
      </ProvidersProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("cursor hit preview")).toBeNull();
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });
});

describe("MessageSearchPanel view conversation wiring", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionActionsSpy.mockClear();
  });

  beforeEach(() => {
    mockSearch.mockReset();
    sessionActionsSpy.mockClear();
    mockSearch.mockResolvedValue({
      hits: [cursorHit],
      capped: false,
      limit: 200,
    });
  });

  it("passes hit lineNumber as initialLineNumber on search result actions", async () => {
    const user = userEvent.setup();
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    await user.type(
      screen.getByPlaceholderText(/substring in JSONL/i),
      "hello"
    );
    await user.click(searchButton());

    await waitFor(() => {
      expect(sessionActionsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: cursorHit.sessionId,
          initialLineNumber: cursorHit.lineNumber,
        })
      );
    });
  });
});

describe("MessageSearchPanel filter bar", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockSearch.mockReset();
    mockSearch.mockResolvedValue({
      hits: [],
      capped: false,
      limit: 200,
    });
  });

  it("toggles date mode, updates aria-label, and writes localStorage", async () => {
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    expect(dateModeToggle().textContent).toBe("Updated");
    expect(
      dateModeToggle().getAttribute("aria-label")
    ).toBe(
      "Session dates filter applies to: Updated. Click to switch to Created."
    );

    const user = userEvent.setup();
    await user.click(dateModeToggle());

    expect(dateModeToggle().textContent).toBe("Created");
    expect(
      dateModeToggle().getAttribute("aria-label")
    ).toBe(
      "Session dates filter applies to: Created. Click to switch to Updated."
    );
    expect(localStorage.getItem(MSG_SEARCH_DATE_MODE_STORAGE_KEY)).toBe(
      "created"
    );
  });

  it("restores Created on mount when localStorage is created", () => {
    localStorage.setItem(MSG_SEARCH_DATE_MODE_STORAGE_KEY, "created");
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    expect(dateModeToggle().textContent).toBe("Created");
  });

  it("keeps date-mode storage independent from SessionFilterBar", () => {
    localStorage.setItem(FILTER_DATE_MODE_STORAGE_KEY, "created");
    localStorage.setItem(MSG_SEARCH_DATE_MODE_STORAGE_KEY, "updated");

    render(
      <>
        <SessionFilterBar {...sessionFilterBarProps} dateField="created" />
        <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
      </>
    );

    expect(
      screen.getByRole("button", {
        name: "Date filter applies to: Created. Click to switch to Updated.",
      }).textContent
    ).toBe("Created");
    expect(dateModeToggle().textContent).toBe("Updated");

    localStorage.setItem(MSG_SEARCH_DATE_MODE_STORAGE_KEY, "created");
    expect(localStorage.getItem(FILTER_DATE_MODE_STORAGE_KEY)).toBe("created");
    expect(
      screen.getByRole("button", {
        name: "Date filter applies to: Created. Click to switch to Updated.",
      }).textContent
    ).toBe("Created");
  });

  it("clears Message text and refocuses the input", async () => {
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    const user = userEvent.setup();
    const input = screen.getByLabelText("Message text") as HTMLInputElement;
    await user.type(input, "hello");
    await user.click(screen.getAllByRole("button", { name: "Clear" })[0]!);

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
  });

  it("clears Workspace and Role inputs and refocuses each", async () => {
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    const user = userEvent.setup();
    const workspace = screen.getByLabelText("Workspace") as HTMLInputElement;
    const role = screen.getByLabelText("Role") as HTMLInputElement;

    await user.type(workspace, "ws");
    await user.click(
      screen.getAllByRole("button", { name: "Clear" }).find((btn) => {
        const wrap = btn.closest(".session-filter-bar__input-wrap");
        return wrap?.querySelector("#msg-search-workspace") != null;
      })!
    );
    expect(workspace.value).toBe("");
    expect(document.activeElement).toBe(workspace);

    await user.type(role, "user");
    await user.click(
      screen.getAllByRole("button", { name: "Clear" }).find((btn) => {
        const wrap = btn.closest(".session-filter-bar__input-wrap");
        return wrap?.querySelector("#msg-search-role") != null;
      })!
    );
    expect(role.value).toBe("");
    expect(document.activeElement).toBe(role);
  });

  it("disables Search when Message text is empty and enables on typing", async () => {
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    expect(searchButton().disabled).toBe(true);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Message text"), "h");

    expect(searchButton().disabled).toBe(false);
  });

  it("runs search when Enter is pressed in Message text and Search is enabled", async () => {
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Message text"), "needle");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    expect(mockSearch.mock.calls[0]![0].q).toBe("needle");
  });

  it("does not run search on Enter when Message text is empty", async () => {
    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Message text"));
    await user.keyboard("{Enter}");

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("calls runSearch with the same payload as before when Search is clicked", async () => {
    renderPanel(
      <MessageSearchPanel
        pathPrefix="/repo"
        workspaces={["/repo/ws"]}
        sourceFilter="cursor"
      />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Message text"), "needle");
    await user.type(screen.getByLabelText("Workspace"), "/repo/ws");
    await user.type(screen.getByLabelText("Role"), "user");
    await user.type(
      screen.getByLabelText("From"),
      "2024-01-01T00:00"
    );
    await user.type(screen.getByLabelText("To"), "2024-12-31T23:59");
    await user.click(dateModeToggle());
    await user.click(searchButton());

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    expect(mockSearch.mock.calls[0]![0]).toEqual({
      q: "needle",
      pathPrefix: "/repo",
      workspace: "/repo/ws",
      dateField: "created",
      rangeFrom: new Date("2024-01-01T00:00").toISOString(),
      rangeTo: new Date("2024-12-31T23:59").toISOString(),
      limit: 500,
      role: "user",
      source: "cursor",
    });
  });

  it("applies loading pulse class while fetch is pending", async () => {
    let resolveSearch!: (value: {
      hits: TranscriptSearchHit[];
      capped: boolean;
      limit: number;
    }) => void;
    mockSearch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        })
    );

    renderPanel(
      <MessageSearchPanel pathPrefix="" workspaces={[]} sourceFilter="all" />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Message text"), "hello");
    await user.click(searchButton());

    expect(searchButton().className).toContain(
      "session-filter-bar__refresh--loading"
    );
    expect(searchButton().disabled).toBe(true);

    resolveSearch({ hits: [], capped: false, limit: 200 });

    await waitFor(() => {
      expect(searchButton().className).not.toContain(
        "session-filter-bar__refresh--loading"
      );
    });
  });
});
