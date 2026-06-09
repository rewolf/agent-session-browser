# Session data sources

## Provider registry and `SessionSource`

`SessionSource` in `@asb/core` and the frontend is an open `string` (provider id), not a closed `"cursor" | "claude"` union. Valid ids come from the `ProviderRegistry` built at process startup (`defaultProviderRegistry()` in backend/CLI entry points) and then passed through helpers.

- **HTTP / CLI filtering** — `?source=` and `--source` accept `all` or any registered id. Unknown values return `400` (API) or a CLI error whose message lists `registry.ids()` (not hardcoded provider names). Parsing now receives `registry` explicitly (`parseSourceQuery(raw, registry)` / `parseSourceOption(value, registry)`).
- **Resume commands** — `formatResumeCommand(session, registry)` in `packages/core/src/resume-command.ts` builds `cd <workspace> && <provider tail>`. Unknown `session.source` throws `Unknown session source: …` (no silent Cursor default). The backend attaches `resumeCommand` on `GET /api/sessions` rows and transcript-search hits; the web UI copies that string (display-only `\\\n` after `&&` stays in `AgentResumeButton`). `GET /api/providers` exposes descriptors (`id`, `displayName`, `resumeCommandName`, …) for filters and tooltips.
- **Adding a provider** — register a `SessionProvider` in the registry; backend, CLI, and frontend pick up new ids without editing closed unions or duplicate resume formatters. See change note [1262-open-session-source-union.md](changes/1262-open-session-source-union.md) and provider-readiness contract details in [1310-provider-readiness.md](changes/1310-provider-readiness.md).
- **Provider contract (readiness)** — `scanSessions()` returns `{ sessions, unavailable? }` instead of throwing when auth/network blocks listing. Optional `healthCheck()` for chip/API health. `workspaceGrouping` (`fs-path` | `external-id` | `none`) drives the nav tree. `primaryActions(session)` (or default wrap of `formatResumeCommandTail`) supplies shell/URL actions. **URL actions** in descriptors must be absolute **`http:`** or **`https:`** URLs; the web UI drops other schemes before rendering links. Optional `withScanCache(provider, ttlMs)` for expensive scans.
- **Session list excerpt** — `GET /api/sessions` adds `excerpt?: string | null` on each row: a ≤80-character single-line preview of the first user message, derived provider-agnostically via `provider.findTranscriptFile()` and `deriveSessionTitleFromJsonl` (mtime-cached per JSONL path). The web UI renders a muted sub-row when non-null. See [1567-session-table-excerpt.md](changes/1567-session-table-excerpt.md).

## Workspace storage (legacy index)

`{CURSOR_USER_DIR}/workspaceStorage/<hash>/state.vscdb` key `composer.composerData` → JSON `allComposers` entries with `type: "head"`.

Default `CURSOR_USER_DIR` by platform (when unset):

| OS | Default path |
|----|----------------|
| Linux / BSD / other Unix | `$XDG_CONFIG_HOME/Cursor/User` if set, else `~/.config/Cursor/User` |
| macOS | `~/Library/Application Support/Cursor/User` |
| Windows | `%APPDATA%\Cursor\User`, or `~\AppData\Roaming\Cursor\User` if `APPDATA` is unset |

Set `CURSOR_USER_DIR` to override on any platform.

`workspace.json` may use `workspace` (file URI) or `folder` (single-root); both are supported in `readWorkspaceJsonRoots`.

## Agent transcripts (CLI / recent activity)

`~/.cursor/projects/<slug>/agent-transcripts/<sessionUuid>/<sessionUuid>.jsonl`

Cursor still writes these for Agent / `agent` CLI runs. From early 2026 on some setups, **workspace `composer.composerData` can stop advancing** while transcripts keep updating — so the UI looked “empty after April.”

`loadAllSessions` merges deduped workspace rows with transcript-derived rows (file mtime → `updatedAt`; **no** title is inferred from JSONL). Slug → filesystem path uses `slugToWorkspacePath` (partition hyphen tokens against directories that exist on disk); ambiguous paths fall back to the project folder under `~/.cursor/projects/<slug>`.

Every `Session` from Cursor paths includes `source: "cursor"`. Cursor-specific discovery lives in `cursor-provider.ts`.

## Claude Code transcripts

`~/.claude/projects/<hash>/<sessionUuid>.jsonl` (top-level JSONL per project hash, not under `agent-transcripts/`).

- `scanClaudeSessions()` → `source: "claude"`, optional `metadata` (e.g. gitBranch, cliVersion, permissionMode, hasSidechains) from a head/tail JSONL scan.
- Hash → workspace path reuses the same DFS as Cursor (`hashedPathToWorkspacePath` / `hashedDirToWorkspacePath`).
- When `name` is absent, `deriveSessionTitleFromJsonl` reads until the first user message text (≤80 chars, `stripUserQueryTags`), cached by path + mtime. The same helper backs `excerpt` on `GET /api/sessions` rows for all providers (see [1567-session-table-excerpt.md](changes/1567-session-table-excerpt.md)).
- `loadAllSessions` appends deduped Claude sessions after the Cursor merge; dedup is **per source** only. Claude-specific discovery lives in `claude-provider.ts`.
- Providers own transcript reads (`provider.loadConversation`) by passing `TranscriptFileRef` into `loadSessionConversation(ref)`. Source-id lookup remains available as `loadSessionConversationBySource(sessionId, source, registry)` for API handlers that only have an id/source pair. Unknown source ids throw; the HTTP API returns 400 when source cannot be resolved. Each parsed line may include `uuid`, `parentUuid`, and `isSidechain` for subagent threading in the UI.
- `ASB_CLAUDE_PROJECTS_DIR` overrides the projects root (default `~/.claude/projects`).
- Web UI (when source filter is **Claude**): session list shows metadata badges; optional git-branch and permission-mode filters via `metadata.*` query params; conversation modal can expand nested sidechain threads under a parent `uuid`.

## Transcript line search

`searchTranscriptLines` (and `GET /api/transcript-search`) stream-read each `<sessionUuid>.jsonl` and return case-insensitive substring hits with line number and a short single-line preview. Results are ordered **newest first** by per-line JSON time when available (`timestamp`, `messageTime`, `createdAt`, `time`, including nested under `message`), otherwise by the merged session row’s `updatedAt` (passed via `sessionUpdatedAt` from the API). The `limit` keeps the newest matches across the scanned scope, not the first matches in file order. Optional **session scope** before scanning: repo `pathPrefix` (`sessionsUnderPath`), exact `workspace` path, and/or a **created** or **updated** timestamp range — same semantics as the sessions list (merged session row timestamps, not per-line JSON timestamps). Optional query parameter `role` (or core option `role`): only lines that parse as a JSON object with a string `role` equal to the filter (trimmed, case-insensitive) are returned; each hit includes the parsed `role` when present. The function now requires a registry in options (`searchTranscriptLines(q, { registry, ... })`).

## Transcript index (search)

`listAllTranscriptJsonlFiles(registry)` returns Cursor agent-transcript JSONL and Claude top-level JSONL, each tagged with `source` (`TranscriptFileRef`). `searchTranscriptLines` scans both unless `options.source` is set.

## Environment

- `CURSOR_USER_DIR` — Cursor `User` directory (see table above for per-OS defaults).
- `ASB_CURSOR_PROJECTS_DIR` — Cursor projects root (default `~/.cursor/projects`).
- `ASB_CLAUDE_PROJECTS_DIR` — Claude projects root (default `~/.claude/projects`).

## Duplicate composer ids

Rare duplicate `composerId` across workspace DB files: `dedupeSessionsByNewestUpdated` keeps the newest row before merging transcripts.
