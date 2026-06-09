# TODO-1180: Platform-aware Cursor user directory resolution

## Goal

Resolve Cursor’s on-disk `User` directory (workspaceStorage, etc.) with OS-specific defaults while keeping `CURSOR_USER_DIR` as the override on all platforms.

## Approach

1. Add `defaultCursorUserDirForPlatform(platform, env, home)` with pure path logic for tests.
2. Implement `defaultCursorUserDir()` as a thin wrapper using `process.platform`, `process.env`, and `os.homedir()`.
3. Keep `resolveCursorUserDir()` env-first, then `path.resolve(defaultCursorUserDir())`.
4. Unit tests cover darwin, linux (XDG on/off), win32 (APPDATA set/unset), and a non-primary platform (freebsd → Linux/XDG rules).
5. Document per-OS defaults in README; relocate `docs/ai-context/session-sources.md` into `docs/technical/`.

## Platform defaults

| Platform | Default (when env unset) |
|----------|--------------------------|
| macOS (`darwin`) | `{home}/Library/Application Support/Cursor/User` |
| Linux / other Unix | `{XDG_CONFIG_HOME or home/.config}/Cursor/User` |
| Windows (`win32`) | `{APPDATA or home/AppData/Roaming}/Cursor/User` |

## Out of scope

- `~/.cursor/projects` / `CSB_CURSOR_PROJECTS_DIR` (unchanged).
- Filesystem existence probing or install discovery.

## Test plan

- `npm run test --prefix packages/core` — new `defaultCursorUserDirForPlatform` and `resolveCursorUserDir` cases.

---

## Shipped (implementation)

- Added `defaultCursorUserDirForPlatform(platform, env, home)` in `packages/core/src/paths.ts`; `defaultCursorUserDir()` delegates to it with live `process` / `homedir()`.
- Windows paths use `path.win32.join` so `%APPDATA%`-based paths keep backslashes on Windows.
- Non-primary Unix (`freebsd`, etc.) use the Linux / XDG branch (documented in README and `docs/technical/session-sources.md`).
- Eight new unit tests in `paths.test.ts` (platform matrix + `CURSOR_USER_DIR` override).
- README configuration table; `docs/ai-context/` removed — content moved to `docs/technical/session-sources.md`.
- No change to `resolveCursorProjectsDir` / `~/.cursor/projects` defaults.
