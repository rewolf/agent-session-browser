import { describe, expect, it } from "vitest";
import {
  parseMetadataFilterFromCliPairs,
  parseMetadataFilterFromQuery,
} from "./metadata-filter.js";

describe("parseMetadataFilterFromQuery", () => {
  it("parses metadata.* keys from a flat query object", () => {
    expect(
      parseMetadataFilterFromQuery({
        q: "hello",
        "metadata.gitBranch": "main",
        "metadata.permissionMode": "acceptEdits",
      })
    ).toEqual({
      gitBranch: "main",
      permissionMode: "acceptEdits",
    });
  });

  it("ignores empty values and non-string entries", () => {
    expect(
      parseMetadataFilterFromQuery({
        "metadata.gitBranch": "  ",
        "metadata.permissionMode": ["plan"],
      })
    ).toBeUndefined();
  });

  it("returns undefined when no metadata keys", () => {
    expect(parseMetadataFilterFromQuery({ source: "claude" })).toBeUndefined();
  });
});

describe("parseMetadataFilterFromCliPairs", () => {
  it("parses key=value pairs", () => {
    expect(
      parseMetadataFilterFromCliPairs([
        "gitBranch=main",
        "permissionMode=acceptEdits",
      ])
    ).toEqual({
      gitBranch: "main",
      permissionMode: "acceptEdits",
    });
  });

  it("skips malformed pairs", () => {
    expect(parseMetadataFilterFromCliPairs(["nope", "=bad", "key="])).toBe(
      undefined
    );
  });
});
