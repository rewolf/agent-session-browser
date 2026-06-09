import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Platform-specific default Cursor `User` directory without reading `process`.
 * Non-primary Unix platforms (e.g. freebsd) follow Linux / XDG rules.
 */
export function defaultCursorUserDirForPlatform(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  home: string
): string {
  switch (platform) {
    case "darwin":
      return path.join(
        home,
        "Library",
        "Application Support",
        "Cursor",
        "User"
      );
    case "win32": {
      const appData = env.APPDATA;
      if (appData && appData.length > 0) {
        return path.win32.join(appData, "Cursor", "User");
      }
      return path.win32.join(home, "AppData", "Roaming", "Cursor", "User");
    }
    case "linux":
    default: {
      const xdg = env.XDG_CONFIG_HOME;
      if (xdg && xdg.length > 0) {
        return path.join(path.resolve(xdg), "Cursor", "User");
      }
      return path.join(home, ".config", "Cursor", "User");
    }
  }
}

/** Resolve default Cursor user dir for the current OS and environment. */
export function defaultCursorUserDir(): string {
  return defaultCursorUserDirForPlatform(
    process.platform,
    process.env,
    homedir()
  );
}

export function resolveCursorUserDir(): string {
  const fromEnv = process.env.CURSOR_USER_DIR;
  if (fromEnv && fromEnv.length > 0) {
    return path.resolve(fromEnv);
  }
  return path.resolve(defaultCursorUserDir());
}

/** Default Claude Code projects root (`~/.claude/projects`). */
export function defaultClaudeProjectsDir(): string {
  return path.join(homedir(), ".claude", "projects");
}

export function resolveClaudeProjectsDir(): string {
  const fromEnv = process.env.ASB_CLAUDE_PROJECTS_DIR;
  if (fromEnv && fromEnv.length > 0) {
    return path.resolve(fromEnv);
  }
  return path.resolve(defaultClaudeProjectsDir());
}

export function fileUriToPath(uri: string): string | null {
  try {
    if (uri.startsWith("file://")) {
      return fileURLToPath(new URL(uri));
    }
    if (path.isAbsolute(uri)) {
      return path.resolve(uri);
    }
  } catch {
    return null;
  }
  return null;
}

export type WorkspaceRoot = {
  /** Canonical absolute path: folder or .code-workspace file */
  roots: string[];
  storageId: string;
};

export function readWorkspaceJsonRoots(
  workspaceJsonPath: string,
  storageId: string
): WorkspaceRoot | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(workspaceJsonPath, "utf8"));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const r = raw as { workspace?: unknown; folder?: unknown };
  /** VS Code / Cursor: multi-root or `.code-workspace` uses `workspace`; single-folder often uses `folder` (newer). */
  const uriStr =
    typeof r.workspace === "string"
      ? r.workspace
      : typeof r.folder === "string"
        ? r.folder
        : null;
  if (!uriStr) {
    return null;
  }
  const fsPath = fileUriToPath(uriStr);
  if (!fsPath) {
    return null;
  }
  const resolved = path.resolve(fsPath);
  if (resolved.endsWith(".code-workspace")) {
    return expandCodeWorkspace(resolved, storageId);
  }
  return { roots: [resolved], storageId };
}

function expandCodeWorkspace(
  workspaceFile: string,
  storageId: string
): WorkspaceRoot | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(workspaceFile, "utf8"));
  } catch {
    return { roots: [workspaceFile], storageId };
  }
  if (!raw || typeof raw !== "object") {
    return { roots: [workspaceFile], storageId };
  }
  const folders = (raw as { folders?: unknown }).folders;
  if (!Array.isArray(folders) || folders.length === 0) {
    return { roots: [workspaceFile], storageId };
  }
  const roots: string[] = [];
  const base = path.dirname(workspaceFile);
  for (const f of folders) {
    if (!f || typeof f !== "object") continue;
    const p = (f as { path?: unknown }).path;
    if (typeof p !== "string") continue;
    const abs = path.isAbsolute(p) ? path.resolve(p) : path.resolve(base, p);
    roots.push(abs);
  }
  return roots.length > 0 ? { roots, storageId } : null;
}
