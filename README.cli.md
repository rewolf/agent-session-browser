# CLI (`asb`)

Browse local AI coding sessions from registered providers (default registry: **Cursor** Composer / Agent and **Claude Code**). Data paths depend on the provider; built-ins read:

- `{CURSOR_USER_DIR}/workspaceStorage/*/workspace.json` (default `User` path is OS-specific — see root [README.md](README.md#configuration))
- `{CURSOR_USER_DIR}/workspaceStorage/*/state.vscdb` → `composer.composerData` (sidebar / IDE session list; may stop updating for some installs while transcripts still grow)
- `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl` — merged in so **CLI / Agent** runs still appear when the workspace DB is stale

Override the Cursor user directory:

```bash
export CURSOR_USER_DIR=/path/to/Cursor/User
```

Override the Cursor projects root (default `~/.cursor/projects`):

```bash
export ASB_CURSOR_PROJECTS_DIR=/path/to/cursor/projects
```

## Install / build

From the repo root:

```bash
npm install
npm run install:all              # see root README "npm / TLS / registry" for corporate MITM workarounds
npm run build --prefix packages/core
npm run build --prefix packages/cli
```

Run:

```bash
node packages/cli/dist/index.js --help
```

Optional global link (after build): `npm link` from `packages/cli`.

## Non-interactive

| Flag | Description |
|------|-------------|
| `--list-workspaces` | Print all workspace root paths (folders from Cursor workspaces; multi-root `.code-workspace` expands to folder paths). |
| `--list-sessions [path]` | List sessions. With no path: restrict to workspaces under **current working directory**. With path: restrict to workspaces under that directory. |
| `--session-name <text>` | Substring match on session **name** or **session id** (case-insensitive). |
| `--created-before` / `--created-after` | Filter on `createdAt` (ISO-8601 string or epoch **milliseconds**). |
| `--updated-before` / `--updated-after` | Filter on `updatedAt` (same date formats). |
| `--metadata <key=value>` | Exact match on `session.metadata[key]` (repeatable; requires `--list-sessions`). |
| `--source <id\|all>` | Filter sessions by provider id (`cursor`, `claude`, …) or `all` (default). Invalid values exit with an error listing ids from the provider registry. |
| `--resume <sessionId>` | Print one shell line from `formatResumeCommand` for that session (e.g. `cd <dir> && agent --resume=…` for Cursor, `cd <dir> && claude --resume …` for Claude). Does not run the command. Uses the session’s workspace path (primary root for multi-root). Ensure the provider CLI (`agent`, `claude`, …) is on your `PATH`. |
| `--exec` | With `--resume`, print the command-bearing entry from `primaryActions` instead of the default resume wrapper. |
| `asb providers` | List registered providers with `health` and `workspace-grouping` columns (`--json` supported). |
| `asb list` | Alias for listing sessions (same filters as `--list-sessions`). Prints `warning: <id> unavailable: …` on stderr when a requested provider reports `unavailable`; exits non-zero only if every requested provider is unavailable. |
| `--json` | With `--list-sessions`, print JSON instead of TSV. |

Examples:

```bash
node packages/cli/dist/index.js --list-workspaces
node packages/cli/dist/index.js --list-sessions
node packages/cli/dist/index.js --list-sessions /home/you/Code/foo --session-name auth
node packages/cli/dist/index.js --list-sessions --source claude --json
node packages/cli/dist/index.js --list-sessions --created-after 1700000000000 --json
node packages/cli/dist/index.js --resume 4569f0ca-6d75-44cb-9739-cf2c76c0f9a6
```

## Interactive

```bash
node packages/cli/dist/index.js --interactive
```

Navigate the collapsed folder tree; sessions are tagged `[source]` (e.g. `[cursor]`, `[claude]`). Pick a session to print the same provider-specific **resume** shell line as `--resume` (`formatResumeCommand`). Respect `--source` when listing (default `all`).

## Notes

- **Multi-root** workspaces: one row per Composer session (not duplicated per folder). Filtering matches if **any** root matches the path prefix.
- Read-only: never writes to Cursor databases.
