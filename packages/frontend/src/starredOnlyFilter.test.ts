/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  readStarredOnlyFilter,
  writeStarredOnlyFilter,
  STARRED_ONLY_FILTER_STORAGE_KEY,
} from "./starredOnlyFilter";

afterEach(() => {
  localStorage.clear();
});

describe("starredOnlyFilter", () => {
  it("defaults to false", () => {
    expect(readStarredOnlyFilter()).toBe(false);
  });

  it("persists enabled state", () => {
    writeStarredOnlyFilter(true);
    expect(localStorage.getItem(STARRED_ONLY_FILTER_STORAGE_KEY)).toBe("true");
    expect(readStarredOnlyFilter()).toBe(true);
  });
});
