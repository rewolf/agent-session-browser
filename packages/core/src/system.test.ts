import { describe, expect, it } from "vitest";
import { resolveSystemUsername } from "./system.js";

describe("resolveSystemUsername", () => {
  it("returns a non-empty string", () => {
    const name = resolveSystemUsername();
    expect(name.length).toBeGreaterThan(0);
  });
});
