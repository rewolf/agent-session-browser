/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewConversationButton } from "./ViewConversationButton";

const modalSpy = vi.fn();

vi.mock("./ConversationModal", () => ({
  ConversationModal: (props: Record<string, unknown>) => {
    modalSpy(props);
    return <div data-testid="conversation-modal-mock" />;
  },
}));

describe("ViewConversationButton", () => {
  afterEach(() => {
    cleanup();
    modalSpy.mockClear();
  });

  it("passes initialLineNumber to ConversationModal when provided", async () => {
    const user = userEvent.setup();
    render(
      <ViewConversationButton
        sessionId="s1"
        source="cursor"
        initialLineNumber={42}
      />
    );

    await user.click(screen.getByRole("button", { name: "View conversation" }));

    expect(modalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "s1",
        initialLineNumber: 42,
      })
    );
  });

  it("does not pass initialLineNumber when omitted", async () => {
    const user = userEvent.setup();
    render(<ViewConversationButton sessionId="s1" source="cursor" />);

    await user.click(screen.getByRole("button", { name: "View conversation" }));

    expect(modalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "s1",
        initialLineNumber: undefined,
      })
    );
  });

  it("keeps View conversation as the accessible name", () => {
    render(<ViewConversationButton sessionId="s1" source="cursor" />);
    expect(
      screen.getByRole("button", { name: "View conversation" })
    ).toBeTruthy();
  });
});
