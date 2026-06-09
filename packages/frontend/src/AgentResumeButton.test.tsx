/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentResumeButton } from "./AgentResumeButton";

vi.mock("./providersContext", () => ({
  useProvider: () => ({
    id: "cursor",
    displayName: "Cursor",
    resumeCommandName: "agent",
    metadataKeys: [],
  }),
}));

describe("AgentResumeButton", () => {
  it("shows display line break from API resumeCommand", async () => {
    const user = userEvent.setup();
    render(
      <AgentResumeButton
        resumeCommand="cd /home/proj && agent --resume=cur-1"
        source="cursor"
      />
    );
    await user.click(
      screen.getByRole("button", { name: /Show agent resume command/i })
    );
    expect(
      document.querySelector(".agent-resume-popover__code")?.textContent
    ).toBe("cd /home/proj && \\\nagent --resume=cur-1");
  });
});
