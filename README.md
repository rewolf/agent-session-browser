# Agent session browser

Local-only tools to list and filter AI coding sessions from registered providers. The default registry includes **Cursor** (Composer / Agent sessions from `workspaceStorage` plus JSONL transcripts under `~/.cursor/projects/`) and **Claude Code** (`~/.claude/projects/`), with source-specific discovery encapsulated behind provider implementations.

**Why this exists:** IDE and CLI history for agent conversations is hard to search, filter, and compare across workspaces. Agent Session Browser reads those transcripts from your machine and presents them in a CLI and web UI so you can find sessions quickly without digging through opaque storage layouts.

**Privacy:** Agent Session Browser reads session files from your local machine only (`~/.cursor/`, `~/.claude/`, and related paths). It does not send session content or metadata to any external service; session data never leaves your machine during normal use.

- **CLI**: [README.cli.md](README.cli.md)
- **Web UI**: [README.ui.md](README.ui.md)
- **Technical docs**: [docs/technical/session-sources.md](docs/technical/session-sources.md)

## Quick start

```bash
npm install          # root devDependencies (e.g. concurrently)
npm run install:all  # each package under packages/*
npm run build
```

`packages/*/dist/` is intentionally ignored in git; run `npm run build` after pulling new commits before starting the CLI/UI locally.

Run the CLI after build: `node packages/cli/dist/index.js --help` or `npm run start --prefix packages/cli`.

Run the UI (API + Vite): `npm run dev` from this root.

## npm / TLS / registry

**[.npmrc](.npmrc)** pins **`registry=https://registry.npmjs.org/`** and **`strict-ssl=true`** (secure default). On corporate networks that intercept TLS, add your CA bundle here instead of disabling verification:

```ini
cafile=/path/to/your-ca-bundle.pem
```

If you cannot install a CA bundle and must work around MITM locally, override **only on your machine** (do not commit): `npm config set strict-ssl false`, or add `strict-ssl=false` to a personal `~/.npmrc`.

`npm run install:all` runs `npm install` **inside** each `packages/*` directory so npm walks up to this `.npmrc`.

## Configuration

`CURSOR_USER_DIR` overrides the default Cursor `User` data directory on every platform. When unset:

| OS | Default |
|----|---------|
| Linux / BSD / other Unix | `$XDG_CONFIG_HOME/Cursor/User` if set, else `~/.config/Cursor/User` |
| macOS | `~/Library/Application Support/Cursor/User` |
| Windows | `%APPDATA%\Cursor\User` (or `~\AppData\Roaming\Cursor\User` if `APPDATA` is unset) |

Agent transcript projects still default to `~/.cursor/projects` (`ASB_CURSOR_PROJECTS_DIR` to override). See [docs/technical/session-sources.md](docs/technical/session-sources.md).

## Cursor / VS Code `workspace.json`

Single-folder windows may store the root as **`folder`** (`file://…`) instead of **`workspace`**. This tool reads both so sessions in newer storage layouts are included.

## Adding a provider

Register a class implementing `SessionProvider` in `@asb/core` and add it to `createDefaultProviders()` (or pass a custom `ProviderRegistry` in tests/tools).

| Hook / field | Required | Purpose |
|--------------|----------|---------|
| `id`, `displayName` | yes | Stable id and UI/CLI label |
| `scanSessions()` | yes | Returns `{ sessions, unavailable? }`. Use `unavailable` when the source exists but cannot list (auth, network, missing binary) instead of throwing or returning an empty list silently |
| `workspaceGrouping` | yes | `fs-path` (directory tree), `external-id` (group on `session.metadata.workspaceKey`), or `none` (flat list) |
| `healthCheck()` | optional | Lightweight `{ ok: true }` or `{ ok: false, reason, message, remediation? }` for provider chips and `GET /api/providers` |
| `primaryActions(session)` | optional | `{ id, label, command?, url? }[]`. If omitted, a single **Resume** action is built from `formatResumeCommandTail`. **URL actions** must use absolute **`http:`** or **`https:`** links only (the web UI omits other schemes) |
| `formatResumeCommandTail` | yes | Source-specific CLI tail (still used for defaults and legacy paths) |
| `withScanCache(provider, ttlMs)` | optional wrapper | TTL cache for expensive scans; built-in filesystem providers do not use it |

**Minimal** (filesystem-style): implement `scanSessions` (async), `workspaceGrouping: "fs-path"`, transcript hooks, and `formatResumeCommandTail`. Omit `healthCheck` and `primaryActions` — defaults assume healthy and wrap resume.

**Full** (remote/async-style): implement `healthCheck`, return `unavailable` from `scanSessions` when appropriate, set `workspaceGrouping` to `external-id` or `none`, and supply `primaryActions` when URL or multiple shell actions are needed. Wrap with `withScanCache` if scans are costly.

Backend, CLI (`asb providers`, list warnings), and the web UI consume descriptors and `unavailable` from the registry without per-id conditionals. See [docs/technical/changes/1310-provider-readiness.md](docs/technical/changes/1310-provider-readiness.md).
