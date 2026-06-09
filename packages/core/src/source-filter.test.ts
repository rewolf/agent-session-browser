import { describe, expect, it } from "vitest";
import {
  formatAcceptedSourceList,
  parseSourceFilter,
  parseSourceQueryParam,
  sessionFilterForSource,
} from "./source-filter.js";

describe("parseSourceFilter", () => {
  const ids = ["claude", "cursor"];

  it("accepts all and registered ids (case-insensitive)", () => {
    expect(parseSourceFilter("all", ids)).toBe("all");
    expect(parseSourceFilter("CURSOR", ids)).toBe("cursor");
    expect(parseSourceFilter(" claude ", ids)).toBe("claude");
  });

  it("rejects unknown ids with registry list in message", () => {
    expect(() => parseSourceFilter("vscode", ids)).toThrow(
      /Accepted values: claude, cursor, all/
    );
  });
});

describe("parseSourceQueryParam", () => {
  const ids = ["cursor", "claude"];

  it("defaults to all when missing or empty", () => {
    expect(parseSourceQueryParam(undefined, ids)).toBe("all");
    expect(parseSourceQueryParam("", ids)).toBe("all");
  });

  it("rejects non-string query values", () => {
    expect(() => parseSourceQueryParam(42, ids)).toThrow(/Invalid source query/);
  });
});

describe("formatAcceptedSourceList", () => {
  it("sorts ids and appends all", () => {
    expect(formatAcceptedSourceList(["cursor", "claude"])).toBe(
      "claude, cursor, all"
    );
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
