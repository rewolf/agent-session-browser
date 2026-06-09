# TODO-1190 — Phase 5: Claude polish (claudeMeta UI + filters)

## Goal

Light up `claudeMeta` and per-line sidechain fields from Phase 1: session-list badges and filters, CLI filters, and expandable subagent threads in the conversation modal.

## Plan

1. **Core filters** — Extend `SessionFilter` with `gitBranch` and `permissionMode`; `filterSessions` matches `claudeMeta` on Claude rows only.
2. **Conversation loader** — Retain `uuid`, `parentUuid`, `isSidechain` on `TranscriptConversationMessage`; `indexSidechainThreads()` groups children under parents.
3. **Backend** — `GET /api/sessions?gitBranch=&permissionMode=`; serialize `claudeMeta` on session rows.
4. **CLI** — `--git-branch` and `--permission-mode` on `--list-sessions`.
5. **Frontend** — `claudeMeta` on `ApiSession`; Claude-only filter inputs; meta badges + sidechain column in `SessionTable`; expandable sidechain block in `ConversationModal`.
6. **Tests** — Core `filterSessions` + `parseJsonlConversationLine` sidechain fields + `indexSidechainThreads`; frontend unit tests for badges/helpers where pure.

## Acceptance mapping

| Item | Approach |
|------|----------|
| Git-branch filter (Claude) | UI text field when source=claude; API + core filter; CLI `--git-branch` |
| Permission-mode indicator + filter | Badge column; filter field; CLI `--permission-mode` |
| Sidechain row indicator | `hasSidechains` badge in session table |
| Expandable subagent thread | Hide nested sidechain lines from main timeline; expand under parent via `parentUuid` / `uuid` |
| Conversation loader fields | Parse and return on each message (not stripped by `extractContentBlocks`) |

## Test gaps

- No browser e2e for modal expand/collapse; covered by core thread-index tests and component logic in `ConversationModal` helpers.

## Shipped

- **Core** — `SessionFilter.gitBranch` / `permissionMode`; `filterSessions` Claude-only matching; `TranscriptConversationMessage` sidechain fields; `indexSidechainThreads()` + tests.
- **Backend** — `GET /api/sessions?gitBranch=&permissionMode=`; `claudeMeta` on serialized session rows.
- **CLI** — `--git-branch`, `--permission-mode`; JSON output includes `claudeMeta`.
- **Frontend** — `ClaudeMetaBadges` column; Claude-only filter fields when source=claude; `indexSidechainThreads` (browser copy) + expandable subagent block in `ConversationModal`; Vitest for badges and thread index.
- **Docs** — `README.cli.md`, `session-sources.md` updated.

## Deviations

- `indexSidechainThreads` is duplicated in `packages/frontend` (same as Phase 4 `resumeCommand` pattern — no `@csb/core` in the Vite bundle).

## Commits

- `a4a4c68` — implementation plan
- `29fca97` — core, backend, CLI
- `7812028` — frontend UI
