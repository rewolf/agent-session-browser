/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SessionPrimaryActions } from "./SessionPrimaryActions";

vi.mock("./providersContext", () => ({
  useProvider: () => ({
    id: "test-source",
    displayName: "Test",
    resumeCommandName: "agent",
    metadataKeys: [],
  }),
}));

const source = "test-source";

describe("SessionPrimaryActions URL allowlist", () => {
  it("renders https links with session-action-link and noreferrer noopener", () => {
    render(
      <SessionPrimaryActions
        source={source}
        resumeCommand="resume cmd"
        primaryActions={[
          { id: "open", label: "Open docs", url: "https://example.com/docs" },
        ]}
      />
    );
    const link = screen.getByRole("link", { name: "Open docs" });
    expect(link.getAttribute("href")).toBe("https://example.com/docs");
    expect(link.className).toBe("session-action-link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
  });

  it("renders http links", () => {
    render(
      <SessionPrimaryActions
        source={source}
        resumeCommand="resume cmd"
        primaryActions={[
          { id: "open", label: "Open site", url: "http://example.com" },
        ]}
      />
    );
    expect(screen.getByRole("link", { name: "Open site" }).getAttribute("href")).toBe(
      "http://example.com"
    );
  });

  it("omits javascript: URL actions from the DOM", () => {
    const { container } = render(
      <SessionPrimaryActions
        source={source}
        resumeCommand="resume cmd"
        primaryActions={[
          { id: "xss", label: "Run", url: "javascript:alert(1)" },
        ]}
      />
    );
    expect(within(container).queryByRole("link")).toBeNull();
    expect(screen.queryByText("Run")).toBeNull();
  });

  it("omits data: and other exotic schemes", () => {
    const { container } = render(
      <SessionPrimaryActions
        source={source}
        resumeCommand="resume cmd"
        primaryActions={[
          { id: "data", label: "Data", url: "data:text/html,<script>alert(1)</script>" },
          { id: "file", label: "File", url: "file:///etc/passwd" },
        ]}
      />
    );
    expect(within(container).queryByRole("link")).toBeNull();
    expect(screen.queryByText("Data")).toBeNull();
    expect(screen.queryByText("File")).toBeNull();
  });

  it("omits scheme-relative and relative paths", () => {
    const { container } = render(
      <SessionPrimaryActions
        source={source}
        resumeCommand="resume cmd"
        primaryActions={[
          { id: "proto", label: "Proto", url: "//evil.example/phish" },
          { id: "abs", label: "Abs", url: "/local/path" },
          { id: "rel", label: "Rel", url: "relative/path" },
        ]}
      />
    );
    expect(within(container).queryByRole("link")).toBeNull();
  });

  it("keeps command actions when a URL action is rejected", () => {
    render(
      <SessionPrimaryActions
        source={source}
        resumeCommand="resume cmd"
        primaryActions={[
          { id: "resume", label: "Resume", command: "my resume cmd" },
          { id: "bad", label: "Bad link", url: "javascript:void(0)" },
          { id: "good", label: "Good link", url: "https://safe.example" },
        ]}
      />
    );
    expect(screen.getByRole("button", { name: /Resume/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Bad link" })).toBeNull();
    expect(screen.getByRole("link", { name: "Good link" }).getAttribute("href")).toBe(
      "https://safe.example"
    );
  });
});
