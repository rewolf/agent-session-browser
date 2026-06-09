/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionFilterBar } from "./SessionFilterBar";
import {
  FILTER_DATE_MODE_STORAGE_KEY,
  readFilterDateMode,
  writeFilterDateMode,
  type FilterDateMode,
} from "./filterDateMode";
import {
  normalizeSessionFilterSnapshot,
  sessionFiltersDirty,
  type SessionFilterSnapshot,
} from "./sessionFilterSnapshot";

const baseProps = {
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
  starredOnly: false,
  onStarredOnlyChange: vi.fn(),
  loading: false,
  refreshDisabled: true,
  onRefresh: vi.fn(),
};

const APPLIED_BASELINE: SessionFilterSnapshot = normalizeSessionFilterSnapshot({
  workspaceFilter: "",
  textQ: "",
  dateField: "created",
  rangeFrom: "",
  rangeTo: "",
});

function refreshButton() {
  return screen.getByRole("button", {
    name: "Refresh session list with current filters",
  }) as HTMLButtonElement;
}

/** Mirrors App.tsx: refresh disabled when current filters match last-applied snapshot. */
function RefreshDirtyHarness({
  applied = APPLIED_BASELINE,
  initialWorkspace = "",
  initialTextQ = "",
  initialDateField = "created" as FilterDateMode,
  initialRangeFrom = "",
  initialRangeTo = "",
}: {
  applied?: SessionFilterSnapshot;
  initialWorkspace?: string;
  initialTextQ?: string;
  initialDateField?: FilterDateMode;
  initialRangeFrom?: string;
  initialRangeTo?: string;
}) {
  const [workspaceFilter, setWorkspaceFilter] =
    React.useState(initialWorkspace);
  const [textQ, setTextQ] = React.useState(initialTextQ);
  const [dateField, setDateField] =
    React.useState<FilterDateMode>(initialDateField);
  const [rangeFrom, setRangeFrom] = React.useState(initialRangeFrom);
  const [rangeTo, setRangeTo] = React.useState(initialRangeTo);
  const onRefresh = vi.fn();

  const current = normalizeSessionFilterSnapshot({
    workspaceFilter,
    textQ,
    dateField,
    rangeFrom,
    rangeTo,
  });
  const refreshDisabled = !sessionFiltersDirty(current, applied);

  return (
    <SessionFilterBar
      {...baseProps}
      workspaceFilter={workspaceFilter}
      onWorkspaceFilterChange={setWorkspaceFilter}
      textQ={textQ}
      onTextQChange={setTextQ}
      dateField={dateField}
      onDateFieldToggle={vi.fn()}
      rangeFrom={rangeFrom}
      onRangeFromChange={setRangeFrom}
      rangeTo={rangeTo}
      onRangeToChange={setRangeTo}
      refreshDisabled={refreshDisabled}
      onRefresh={onRefresh}
    />
  );
}

function DateModeHarness({
  initialMode = readFilterDateMode(),
  onDateFieldToggleSpy,
}: {
  initialMode?: FilterDateMode;
  onDateFieldToggleSpy?: ReturnType<typeof vi.fn>;
}) {
  const [dateField, setDateField] =
    React.useState<FilterDateMode>(initialMode);

  const onDateFieldToggle = () => {
    onDateFieldToggleSpy?.();
    const next: FilterDateMode =
      dateField === "created" ? "updated" : "created";
    setDateField(next);
    writeFilterDateMode(next);
  };

  return (
    <SessionFilterBar
      {...baseProps}
      dateField={dateField}
      onDateFieldToggle={onDateFieldToggle}
    />
  );
}

describe("SessionFilterBar", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("toggles date mode from Created to Updated, calls onDateFieldToggle, and writes localStorage", async () => {
    const onDateFieldToggleSpy = vi.fn();
    render(
      <DateModeHarness
        initialMode="created"
        onDateFieldToggleSpy={onDateFieldToggleSpy}
      />
    );

    const toggle = screen.getByRole("button", {
      name: "Date filter applies to: Created. Click to switch to Updated.",
    });
    const user = userEvent.setup();
    await user.click(toggle);

    expect(onDateFieldToggleSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", {
        name: "Date filter applies to: Updated. Click to switch to Created.",
      }).textContent
    ).toBe("Updated");
    expect(localStorage.getItem(FILTER_DATE_MODE_STORAGE_KEY)).toBe("updated");
  });

  it("renders Updated on initial mount when localStorage is updated", () => {
    localStorage.setItem(FILTER_DATE_MODE_STORAGE_KEY, "updated");
    render(<DateModeHarness />);

    expect(
      screen.getByRole("button", {
        name: "Date filter applies to: Updated. Click to switch to Created.",
      }).textContent
    ).toBe("Updated");
  });

  it("disables Refresh on mount when filters match applied snapshot", () => {
    render(<RefreshDirtyHarness />);

    expect(refreshButton().disabled).toBe(true);
  });

  it("calls onRefresh when Enter is pressed in Name / ID and Refresh is enabled", async () => {
    const onRefresh = vi.fn();
    render(
      <SessionFilterBar
        {...baseProps}
        refreshDisabled={false}
        onRefresh={onRefresh}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Name / ID"));
    await user.keyboard("{Enter}");

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not call onRefresh on Enter when Refresh is disabled", async () => {
    const onRefresh = vi.fn();
    render(
      <SessionFilterBar
        {...baseProps}
        refreshDisabled={true}
        onRefresh={onRefresh}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Name / ID"));
    await user.keyboard("{Enter}");

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("enables Refresh when typing in Workspace and calls onRefresh when clicked", async () => {
    const onRefresh = vi.fn();
    function Harness() {
      const [workspaceFilter, setWorkspaceFilter] = React.useState("");
      const current = normalizeSessionFilterSnapshot({
        workspaceFilter,
        textQ: "",
        dateField: "created",
        rangeFrom: "",
        rangeTo: "",
      });
      const refreshDisabled = !sessionFiltersDirty(
        current,
        APPLIED_BASELINE
      );
      return (
        <SessionFilterBar
          {...baseProps}
          workspaceFilter={workspaceFilter}
          onWorkspaceFilterChange={setWorkspaceFilter}
          refreshDisabled={refreshDisabled}
          onRefresh={onRefresh}
        />
      );
    }

    render(<Harness />);
    expect(refreshButton().disabled).toBe(true);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Workspace"), "foo");

    expect(refreshButton().disabled).toBe(false);

    await user.click(refreshButton());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("clears workspace input and keeps Refresh enabled when still dirty vs applied", async () => {
    const applied = normalizeSessionFilterSnapshot({
      workspaceFilter: "foo",
      textQ: "",
      dateField: "created",
      rangeFrom: "",
      rangeTo: "",
    });

    render(
      <RefreshDirtyHarness
        applied={applied}
        initialWorkspace="foobar"
      />
    );

    expect(refreshButton().disabled).toBe(false);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect((screen.getByLabelText("Workspace") as HTMLInputElement).value).toBe(
      ""
    );
    expect(refreshButton().disabled).toBe(false);
  });

  it("applies loading pulse class while fetch is pending", () => {
    render(
      <SessionFilterBar {...baseProps} loading={true} refreshDisabled={true} />
    );

    const refresh = refreshButton();
    expect(refresh.className).toContain("session-filter-bar__refresh--loading");
    expect(refresh.disabled).toBe(true);
  });

  it("date row uses flex layout with header then packed From → To controls", () => {
    render(<SessionFilterBar {...baseProps} />);

    const dateRow = document.querySelector(
      ".session-filter-bar__date-row"
    ) as HTMLElement;
    expect(dateRow).toBeTruthy();

    const children = Array.from(dateRow.children);
    expect(children).toHaveLength(4);
    expect(
      (children[0] as HTMLElement).classList.contains(
        "session-filter-bar__date-header"
      )
    ).toBe(true);
    expect(children[1].tagName).toBe("LABEL");
    expect(children[1].textContent).toContain("From");
    expect(
      (children[2] as HTMLElement).classList.contains(
        "session-filter-bar__date-separator"
      )
    ).toBe(true);
    expect(children[2].textContent).toBe("→");
    expect(children[3].tagName).toBe("LABEL");
    expect(children[3].textContent).toContain("To");
  });

  it("restores only date-mode preference after remount", () => {
    localStorage.setItem(FILTER_DATE_MODE_STORAGE_KEY, "created");

    const { unmount } = render(
      <SessionFilterBar
        {...baseProps}
        dateField="updated"
        workspaceFilter="ws"
        textQ="query"
        rangeFrom="2024-01-01T00:00"
        rangeTo="2024-12-31T23:59"
        onDateFieldToggle={vi.fn()}
      />
    );

    writeFilterDateMode("updated");
    unmount();

    render(
      <SessionFilterBar
        {...baseProps}
        dateField={readFilterDateMode()}
        onDateFieldToggle={vi.fn()}
      />
    );

    expect(localStorage.getItem(FILTER_DATE_MODE_STORAGE_KEY)).toBe("updated");
    expect(
      screen.getByRole("button", {
        name: "Date filter applies to: Updated. Click to switch to Created.",
      })
    ).toBeTruthy();
    expect((screen.getByLabelText("Workspace") as HTMLInputElement).value).toBe(
      ""
    );
    expect((screen.getByLabelText("Name / ID") as HTMLInputElement).value).toBe(
      ""
    );
  });
});

describe("SessionFilterBar starred only", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("toggles starred-only filter and calls handler", async () => {
    const user = userEvent.setup();
    const onStarredOnlyChange = vi.fn();
    render(
      <SessionFilterBar
        {...baseProps}
        starredOnly={false}
        onStarredOnlyChange={onStarredOnlyChange}
      />
    );

    await user.click(screen.getByLabelText("Starred only"));
    expect(onStarredOnlyChange).toHaveBeenCalledWith(true);
  });
});
