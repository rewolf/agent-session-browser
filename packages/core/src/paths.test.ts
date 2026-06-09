import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  defaultCursorUserDirForPlatform,
  readWorkspaceJsonRoots,
  resolveCursorUserDir,
} from "./paths.js";

const HOME = "/home/testuser";

describe("defaultCursorUserDirForPlatform", () => {
  it("uses macOS Application Support on darwin", () => {
    expect(
      defaultCursorUserDirForPlatform("darwin", {}, HOME)
    ).toBe("/home/testuser/Library/Application Support/Cursor/User");
  });

  it("uses ~/.config/Cursor/User on linux when XDG_CONFIG_HOME is unset", () => {
    expect(
      defaultCursorUserDirForPlatform("linux", {}, HOME)
    ).toBe("/home/testuser/.config/Cursor/User");
  });

  it("uses XDG_CONFIG_HOME/Cursor/User on linux when set", () => {
    expect(
      defaultCursorUserDirForPlatform(
        "linux",
        { XDG_CONFIG_HOME: "/custom/config" },
        HOME
      )
    ).toBe("/custom/config/Cursor/User");
  });

  it("resolves relative XDG_CONFIG_HOME on linux", () => {
    const result = defaultCursorUserDirForPlatform(
      "linux",
      { XDG_CONFIG_HOME: "relative/config" },
      HOME
    );
    expect(result.endsWith("relative/config/Cursor/User")).toBe(true);
    expect(path.posix.isAbsolute(result)).toBe(true);
  });

  it("uses APPDATA/Cursor/User on win32 when APPDATA is set", () => {
    expect(
      defaultCursorUserDirForPlatform(
        "win32",
        { APPDATA: "C:\\Users\\test\\AppData\\Roaming" },
        HOME
      )
    ).toBe("C:\\Users\\test\\AppData\\Roaming\\Cursor\\User");
  });

  it("falls back to AppData/Roaming under home on win32 when APPDATA is unset", () => {
    expect(defaultCursorUserDirForPlatform("win32", {}, HOME)).toBe(
      path.win32.join(HOME, "AppData", "Roaming", "Cursor", "User")
    );
  });

  it("uses Linux/XDG rules on non-primary platforms (e.g. freebsd)", () => {
    expect(
      defaultCursorUserDirForPlatform("freebsd", {}, HOME)
    ).toBe("/home/testuser/.config/Cursor/User");
  });
});

describe("resolveCursorUserDir", () => {
  it("returns path.resolve of CURSOR_USER_DIR when set", () => {
    const prev = process.env.CURSOR_USER_DIR;
    process.env.CURSOR_USER_DIR = "/override/cursor/user";
    try {
      expect(resolveCursorUserDir()).toBe(
        path.resolve("/override/cursor/user")
      );
    } finally {
      if (prev === undefined) {
        delete process.env.CURSOR_USER_DIR;
      } else {
        process.env.CURSOR_USER_DIR = prev;
      }
    }
  });
});

describe("readWorkspaceJsonRoots", () => {
  it("resolves single folder from workspace key", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "asb-ws-"));
    try {
      const proj = path.join(dir, "proj");
      mkdirSync(proj);
      const wj = path.join(dir, "workspace.json");
      writeFileSync(
        wj,
        JSON.stringify({ workspace: pathToFileURL(proj).href })
      );
      const out = readWorkspaceJsonRoots(wj, "id1");
      expect(out?.roots).toEqual([path.resolve(proj)]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves single folder from folder key (Cursor / VS Code newer format)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "asb-fld-"));
    try {
      const proj = path.join(dir, "proj");
      mkdirSync(proj);
      const wj = path.join(dir, "workspace.json");
      writeFileSync(wj, JSON.stringify({ folder: pathToFileURL(proj).href }));
      const out = readWorkspaceJsonRoots(wj, "id2");
      expect(out?.roots).toEqual([path.resolve(proj)]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
