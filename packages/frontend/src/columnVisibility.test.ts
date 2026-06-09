/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  METADATA_COLUMN_STORAGE_KEY,
  isMetadataColumnVisible,
  readMetadataColumnPreference,
  writeMetadataColumnPreference,
} from "./columnVisibility";

describe("columnVisibility", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("defaults metadata column to hidden when storage is empty", () => {
    expect(readMetadataColumnPreference()).toBe("hide");
    expect(isMetadataColumnVisible()).toBe(false);
  });

  it("reads show preference from localStorage", () => {
    localStorage.setItem(METADATA_COLUMN_STORAGE_KEY, "show");
    expect(isMetadataColumnVisible()).toBe(true);
  });
});
