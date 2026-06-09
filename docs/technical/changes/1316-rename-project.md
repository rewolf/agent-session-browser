# TODO-1316: Rename project to agent-session-browser

## Rationale

The app supports multiple agent session sources (Cursor, Claude, future providers). External identifiers (`cursor-session-browser`, `@csb/*`, `csb`, `CSB_*`) implied Cursor-only scope after the provider decoupling work shipped. There are no external consumers yet; rename cost is limited to this repository and local clones.

## Identifier mapping (shipped)

| Identifier | Old | New |
|---|---|---|
| Top-level `package.json` name | `cursor-session-browser` | `agent-session-browser` |
| Workspace scope | `@csb/*` | `@asb/*` |
| CLI binary | `csb` | `asb` |
| Env vars | `CSB_*` | `ASB_*` |
| Browser title | Cursor Session Browser | Agent Session Browser |
| `localStorage` convention | `csb.*` | `asb.*` (documented; no keys in code yet) |

## Preserved (explicit)

- **Todo-manager tag** `app:cursor-session-browser` — external CI/CD references this exact string; documented in this file only.
- **Historical** `docs/technical/changes/*.md` entries (except this file) — left unchanged for archival accuracy.
- **Untracked** root phase specs (`01-…`, `cli-01…`) — not rewritten.

## What changed

- All `package.json` names, CLI `bin`, and `@asb/*` import specifiers across `packages/`.
- `ASB_CURSOR_PROJECTS_DIR`, `ASB_CLAUDE_PROJECTS_DIR`, `ASB_JSON` in core/cli.
- Test temp-dir prefixes (`csb-*` → `asb-*`).
- `packages/frontend/index.html` title, `README.md`, `README.cli.md`, `README.ui.md`, `docs/technical/session-sources.md`.
- Lockfiles regenerated via `npm run install:all` (fixed stale extraneous `@csb/core` entry in frontend lock).

## Verification

```sh
rm -rf node_modules packages/*/dist && npm run install:all && npm run build && npm run test
```

CLI: `node packages/cli/dist/index.js --help` shows `asb`; `providers` and `list` work.

## Post-merge (manual)

- GitLab project rename to `agent-session-browser`; update clones with `git remote set-url`.
- New release tag (e.g. `release-v0.16.0`).
