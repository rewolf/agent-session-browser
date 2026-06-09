import { describe, expect, it } from "vitest";
import {
  cycleSourceFilter,
  parseSourceFromSearch,
  sourceFilterLabel,
  sourceFilterToQueryValue,
} from "./sourceFilter.js";

describe("sourceFilterLabel", () => {
  it('returns "All Agents" for the all filter', () => {
    expect(sourceFilterLabel("all", new Map())).toBe("All Agents");
  });
});

describe("parseSourceFromSearch", () => {
  it("defaults to all", () => {
    expect(parseSourceFromSearch("")).toBe("all");
    expect(parseSourceFromSearch("?workspace=x")).toBe("all");
  });

  it("parses known provider ids", () => {
    const ids = ["cursor", "claude", "amp"];
    expect(parseSourceFromSearch("?source=cursor", ids)).toBe("cursor");
    expect(parseSourceFromSearch("?source=claude", ids)).toBe("claude");
    expect(parseSourceFromSearch("?source=amp", ids)).toBe("amp");
  });

  it("ignores invalid or unknown values", () => {
    expect(parseSourceFromSearch("?source=vscode", ["cursor", "claude"])).toBe(
      "all"
    );
    expect(parseSourceFromSearch("?source=amp", ["cursor", "claude"])).toBe(
      "all"
    );
  });

  it("returns all when availableIds is empty regardless of source param", () => {
    expect(parseSourceFromSearch("?source=cursor", [])).toBe("all");
    expect(parseSourceFromSearch("?source=claude", [])).toBe("all");
    expect(parseSourceFromSearch("?source=amp", [])).toBe("all");
  });
});

describe("sourceFilterToQueryValue", () => {
  it("omits param for all", () => {
    expect(sourceFilterToQueryValue("all")).toBeUndefined();
  });

  it("returns source id for single-source filters", () => {
    expect(sourceFilterToQueryValue("cursor")).toBe("cursor");
    expect(sourceFilterToQueryValue("claude")).toBe("claude");
    expect(sourceFilterToQueryValue("amp")).toBe("amp");
  });
});

describe("cycleSourceFilter", () => {
  const ids = ["cursor", "claude", "amp"];

  it("cycles all → first → … → last → all", () => {
    expect(cycleSourceFilter("all", ids)).toBe("cursor");
    expect(cycleSourceFilter("cursor", ids)).toBe("claude");
    expect(cycleSourceFilter("claude", ids)).toBe("amp");
    expect(cycleSourceFilter("amp", ids)).toBe("all");
  });

  it("returns all when current id is unknown", () => {
    expect(cycleSourceFilter("vscode", ids)).toBe("all");
  });
});
