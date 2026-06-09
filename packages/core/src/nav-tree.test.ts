import { describe, expect, it } from "vitest";
import {
  buildNavTree,
  longestCommonPathPrefix,
} from "./nav-tree.js";
import { asPosixPath } from "./test-path.js";

describe("longestCommonPathPrefix", () => {
  it("finds shared prefix", () => {
    const p = longestCommonPathPrefix([
      "/home/a/Code/Tools/fambox",
      "/home/a/Code/Tools/other",
    ]);
    expect(asPosixPath(p)).toBe("/home/a/Code/Tools");
  });
});

describe("buildNavTree", () => {
  it("returns null for empty", () => {
    expect(buildNavTree([])).toBeNull();
  });

  it("single workspace", () => {
    const t = buildNavTree(["/home/foo/project"]);
    expect(t).not.toBeNull();
    expect(t!.workspaceRootsHere.map(asPosixPath)).toContain(
      "/home/foo/project"
    );
  });
});
