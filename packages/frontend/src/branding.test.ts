/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { APP_NAME } from "./branding";

describe("branding", () => {
  it("exports the app display name", () => {
    expect(APP_NAME).toBe("Agent Session Browser");
  });
});
