/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { App } from "./App";
import { ProvidersProvider } from "./providersContext";
import { APP_NAME } from "./branding";
import * as api from "./api";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchProviders: vi.fn().mockResolvedValue([
      {
        id: "cursor",
        displayName: "Cursor",
        metadataKeys: [],
        workspaceGrouping: "fs-path",
        healthStatus: { ok: true },
      },
      {
        id: "claude",
        displayName: "Claude Code",
        metadataKeys: [],
        workspaceGrouping: "fs-path",
        healthStatus: { ok: true },
      },
    ]),
    fetchSessions: vi.fn().mockResolvedValue({ sessions: [], unavailable: [] }),
    fetchWorkspaces: vi.fn().mockResolvedValue([]),
  };
});

function renderApp() {
  return render(
    <ProvidersProvider>
      <App />
    </ProvidersProvider>
  );
}

describe("App header layout", () => {
  afterEach(() => {
    cleanup();
  });

  it("places app-tabs nav as a sibling of header, not inside it", async () => {
    renderApp();
    await screen.findByRole("heading", { level: 1, name: APP_NAME });

    const header = document.querySelector("header.app-header");
    const tabs = document.querySelector("nav.app-tabs");
    expect(header).toBeTruthy();
    expect(tabs).toBeTruthy();
    expect(header!.contains(tabs)).toBe(false);
    expect(header!.nextElementSibling).toBe(tabs);
  });

  it("does not render tagline or stale header copy", async () => {
    renderApp();
    await screen.findByRole("heading", { level: 1, name: APP_NAME });

    const header = document.querySelector("header.app-header");
    expect(header!.querySelector(".tagline")).toBeNull();
    expect(header!.textContent).not.toMatch(
      /Read-only|Composer|CURSOR_USER_DIR/i
    );
  });

  it("keeps a single h1 inside the header", async () => {
    renderApp();
    await screen.findByRole("heading", { level: 1, name: APP_NAME });

    const header = document.querySelector("header.app-header");
    expect(header!.querySelectorAll("h1")).toHaveLength(1);
  });
});
