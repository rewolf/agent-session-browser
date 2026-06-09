/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import {
  FILTER_DATE_MODE_STORAGE_KEY,
  readFilterDateMode,
  writeFilterDateMode,
  filterDateModeAriaLabel,
} from "./filterDateMode";

describe("filterDateMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to created when storage is empty", () => {
    expect(readFilterDateMode()).toBe("created");
  });

  it("reads updated from localStorage", () => {
    localStorage.setItem(FILTER_DATE_MODE_STORAGE_KEY, "updated");
    expect(readFilterDateMode()).toBe("updated");
  });

  it("writes mode to localStorage", () => {
    writeFilterDateMode("updated");
    expect(localStorage.getItem(FILTER_DATE_MODE_STORAGE_KEY)).toBe("updated");
  });

  it("aria-label reflects current and alternative mode", () => {
    expect(filterDateModeAriaLabel("created")).toBe(
      "Date filter applies to: Created. Click to switch to Updated."
    );
    expect(filterDateModeAriaLabel("updated")).toBe(
      "Date filter applies to: Updated. Click to switch to Created."
    );
  });
});
