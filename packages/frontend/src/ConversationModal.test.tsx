/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationModal } from "./ConversationModal";
import { ProvidersProvider } from "./providersContext";
import * as api from "./api";
import type { TranscriptConversation } from "./types";

function renderModal(ui: React.ReactElement) {
  return render(<ProvidersProvider>{ui}</ProvidersProvider>);
}

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, fetchSessionConversation: vi.fn() };
});

const mockFetch = vi.mocked(api.fetchSessionConversation);

const sidechainConversation: TranscriptConversation = {
  sessionId: "sess-side",
  source: "cursor",
  systemUsername: "dev",
  jsonlPath: "/p/sess.jsonl",
  workspacePath: "/p",
  workspaceLeaf: "p",
  messages: [
    {
      lineNumber: 1,
      role: "user",
      messageAt: null,
      uuid: "parent-1",
      blocks: [{ type: "text", text: "parent turn" }],
    },
    {
      lineNumber: 2,
      role: "assistant",
      messageAt: null,
      uuid: "child-1",
      parentUuid: "parent-1",
      isSidechain: true,
      blocks: [{ type: "text", text: "sidechain child hit" }],
    },
  ],
};

const baseConversation: TranscriptConversation = {
  sessionId: "sess-1",
  source: "cursor",
  systemUsername: "dev",
  jsonlPath: "/p/sess.jsonl",
  workspacePath: "/p",
  workspaceLeaf: "p",
  messages: [
    {
      lineNumber: 1,
      role: "user",
      messageAt: null,
      blocks: [{ type: "text", text: "first" }],
    },
    {
      lineNumber: 50,
      role: "assistant",
      messageAt: null,
      blocks: [{ type: "text", text: "deep in thread" }],
    },
    {
      lineNumber: 99,
      role: "assistant",
      messageAt: null,
      blocks: [{ type: "tool_use", name: "grep", detail: "{}" }],
    },
  ],
};

describe("ConversationModal initialLineNumber", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("scrolls to the matched line after load", async () => {
    mockFetch.mockResolvedValue(baseConversation);

    renderModal(
      <ConversationModal
        sessionId="sess-1"
        source="cursor"
        initialLineNumber={50}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("deep in thread")).toBeTruthy();
    });

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });

    const turn = document.querySelector('[data-line-number="50"]');
    expect(turn).toBeTruthy();
    expect(turn?.classList.contains("conversation-turn--highlight")).toBe(true);
  });

  it("enables show tool usages when the target line is tool-only", async () => {
    mockFetch.mockResolvedValue(baseConversation);

    renderModal(
      <ConversationModal
        sessionId="sess-1"
        source="cursor"
        initialLineNumber={99}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      const toggle = screen.getByLabelText("Show tool usages") as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });
    await waitFor(() => expect(screen.getByText("Tool: grep")).toBeTruthy());
  });

  it("opens without scrolling when initialLineNumber is omitted", async () => {
    mockFetch.mockResolvedValue(baseConversation);

    renderModal(
      <ConversationModal
        sessionId="sess-1"
        source="cursor"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("first")).toBeTruthy();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls to a sidechain child after the parent thread expands", async () => {
    mockFetch.mockResolvedValue(sidechainConversation);

    renderModal(
      <ConversationModal
        sessionId="sess-side"
        source="cursor"
        initialLineNumber={2}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("sidechain child hit")).toBeTruthy();
    });

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });

    const childTurn = document.querySelector('[data-line-number="2"]');
    expect(childTurn).toBeTruthy();
    expect(childTurn?.classList.contains("conversation-turn--highlight")).toBe(
      true
    );
  });

  it("falls back without error when line is missing", async () => {
    mockFetch.mockResolvedValue(baseConversation);

    renderModal(
      <ConversationModal
        sessionId="sess-1"
        source="cursor"
        initialLineNumber={9999}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("first")).toBeTruthy();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("ConversationModal in-modal find", () => {
  const scrollIntoView = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    onClose.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
    mockFetch.mockResolvedValue(baseConversation);
  });

  afterEach(() => {
    cleanup();
  });

  it("highlights matches and shows match counter", async () => {
    const user = userEvent.setup();

    renderModal(
      <ConversationModal
        sessionId="sess-1"
        source="cursor"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("first")).toBeTruthy();
    });

    const findInput = screen.getByLabelText("Find in conversation");
    await user.type(findInput, "deep");

    expect(screen.getByText("1 of 1")).toBeTruthy();
    expect(document.querySelector(".conversation-find__mark")).toBeTruthy();
    expect(document.querySelector(".conversation-find__mark--active")).toBeTruthy();
  });

  it("wraps next and previous navigation", async () => {
    const user = userEvent.setup();
    const multiHit: TranscriptConversation = {
      ...baseConversation,
      messages: [
        {
          lineNumber: 1,
          role: "user",
          messageAt: null,
          blocks: [{ type: "text", text: "foo bar foo" }],
        },
      ],
    };
    mockFetch.mockResolvedValue(multiHit);

    renderModal(
      <ConversationModal
        sessionId="sess-1"
        source="cursor"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/foo/)).toBeTruthy();
    });

    await user.type(screen.getByLabelText("Find in conversation"), "foo");
    expect(screen.getByText("1 of 2")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Next match" }));
    expect(screen.getByText("2 of 2")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Next match" }));
    expect(screen.getByText("1 of 2")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Previous match" }));
    expect(screen.getByText("2 of 2")).toBeTruthy();
  });

  it("clears find on Escape before closing the modal", async () => {
    const user = userEvent.setup();

    renderModal(
      <ConversationModal
        sessionId="sess-1"
        source="cursor"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("first")).toBeTruthy();
    });

    const findInput = screen.getByLabelText("Find in conversation");
    await user.type(findInput, "first");
    expect(screen.getByText("1 of 1")).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect((findInput as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("1 of 1")).toBeNull();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("expands sidechain and scrolls to a child match", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(sidechainConversation);

    renderModal(
      <ConversationModal
        sessionId="sess-side"
        source="cursor"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("parent turn")).toBeTruthy();
    });

    await user.type(screen.getByLabelText("Find in conversation"), "sidechain");
    await waitFor(() => {
      expect(screen.getByText("1 of 1")).toBeTruthy();
    });
    const toggle = await screen.findByRole("button", {
      name: /subagent thread/i,
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.textContent).toContain("child hit");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
  });
});
