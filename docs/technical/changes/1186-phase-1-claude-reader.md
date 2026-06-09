# TODO-1186 — Phase 1: Claude reader + source-tagged sessions

## Goal

Core library discovers Cursor and Claude on-disk sessions, each tagged with `source`. No CLI, UI, or HTTP API surface changes in this phase.

## Shipped

- **Types** — `SessionSource`, `ClaudeSessionMeta`, `ComposerSession.source` (+ optional `claudeMeta`).
- **Paths** — `defaultClaudeProjectsDir` / `resolveClaudeProjectsDir` in `paths.ts` (`CSB_CLAUDE_PROJECTS_DIR`).
- **Shared hash → path** — `hashed-dir-path.ts` (`hashedDirToWorkspacePath`); Cursor `slugToWorkspacePath` delegates to it; Claude uses `hashedPathToWorkspacePath`.
- **`claude-transcripts.ts`** — list/scan/find Claude JSONL; head/tail metadata; sync title derivation via `session-title.ts`.
- **Cursor tagging** — `scanSessions`, `scanAgentTranscriptSessions`, `mergeComposerAndTranscriptSessions` set `source: "cursor"`.
- **`loadComposerSessionsMerged`** — Cursor DB + transcript merge, then deduped Claude sessions appended.
- **`loadSessionConversation(sessionId, source?)`** — dispatches by source; legacy second-arg transcript meta still supported for Cursor tests.
- **`listAllTranscriptJsonlFiles`** — in `transcript-jsonl-index.ts`, used by `searchAgentTranscriptLines` (optional `source` filter).
- **`parseJsonlLine`** — maps Claude `type: user|assistant|system` when `role` is absent.
- **Tests** — `claude-transcripts.test.ts` covers AC1.1–AC1.8 scenarios; existing tests updated for `source`.

## Deviations

- `deriveSessionTitleFromJsonl` is synchronous (whole-file read with mtime cache) so `loadComposerSessionsMerged` stays sync for CLI/backend callers.
- `stripUserQueryTags` moved to `user-query-text.ts` to avoid import cycles.

## Follow-up (later phases)

- Wire `source` through HTTP API, CLI, and UI.
- Expose `claudeMeta` in session list UI.

## Branch

`feature/todo-1186`
