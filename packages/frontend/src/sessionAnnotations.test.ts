/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  getSessionAlias,
  isSessionBookmarked,
  readSessionAnnotations,
  sessionAnnotationKey,
  setSessionAlias,
  setSessionBookmarked,
  SESSION_ANNOTATIONS_STORAGE_KEY,
  writeSessionAnnotations,
} from "./sessionAnnotations";

afterEach(() => {
  localStorage.clear();
});

describe("sessionAnnotations", () => {
  it("reads empty map when storage is missing", () => {
    expect(readSessionAnnotations()).toEqual({});
  });

  it("round-trips bookmark and alias entries", () => {
    let map = setSessionBookmarked({}, "cursor", "abc", true);
    map = setSessionAlias(map, "cursor", "abc", "  My label  ");
    writeSessionAnnotations(map);

    const loaded = readSessionAnnotations();
    expect(isSessionBookmarked(loaded, "cursor", "abc")).toBe(true);
    expect(getSessionAlias(loaded, "cursor", "abc")).toBe("My label");
    expect(sessionAnnotationKey("cursor", "abc")).toBe("cursor:abc");
  });

  it("removes empty entries when clearing bookmark and alias", () => {
    let map = setSessionBookmarked({}, "amp", "x", true);
    map = setSessionBookmarked(map, "amp", "x", false);
    expect(map).toEqual({});
  });

  it("clears alias when trimmed input is empty", () => {
    let map = setSessionAlias({}, "claude", "s1", "label");
    map = setSessionAlias(map, "claude", "s1", "   ");
    expect(map).toEqual({});
  });

  it("ignores invalid storage payloads", () => {
    localStorage.setItem(SESSION_ANNOTATIONS_STORAGE_KEY, "not-json");
    expect(readSessionAnnotations()).toEqual({});

    localStorage.setItem(
      SESSION_ANNOTATIONS_STORAGE_KEY,
      JSON.stringify({ "cursor:a": { bookmarked: "yes" } })
    );
    expect(readSessionAnnotations()).toEqual({});
  });
});
