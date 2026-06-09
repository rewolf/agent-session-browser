import { describe, expect, it } from "vitest";
import { defaultProviderRegistry } from "@asb/core";
import { parseSourceQuery, sessionFilterForSource } from "./source-query.js";

describe("parseSourceQuery", () => {
  const registry = defaultProviderRegistry();

  it("defaults to all when missing or empty", () => {
    expect(parseSourceQuery(undefined, registry)).toBe("all");
    expect(parseSourceQuery("", registry)).toBe("all");
  });

  it("accepts cursor, claude, all (case-insensitive)", () => {
    expect(parseSourceQuery("cursor", registry)).toBe("cursor");
    expect(parseSourceQuery("CLAUDE", registry)).toBe("claude");
    expect(parseSourceQuery(" all ", registry)).toBe("all");
  });

  it("rejects invalid values with registry ids in message", () => {
    expect(() => parseSourceQuery("vscode", registry)).toThrow(
      /Accepted values: claude, cursor, all/
    );
    expect(() => parseSourceQuery(42, registry)).toThrow(/Invalid source query/);
  });
});

describe("sessionFilterForSource", () => {
  it("returns empty filter for all", () => {
    expect(sessionFilterForSource("all")).toEqual({});
  });

  it("returns source key for a single source", () => {
    expect(sessionFilterForSource("claude")).toEqual({ source: "claude" });
  });
});
