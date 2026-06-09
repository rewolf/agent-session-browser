# TODO-1187 — Phase 2: CLI source filter and resume command

## Goal

CLI lists sessions filtered by `source`, shows source in interactive mode with an in-picker toggle, and emits the correct resume shell command per source.

## Shipped

- **`SessionFilter.source`** — `filterSessions` accepts `source: "cursor" | "claude"`; tests in `scan.test.ts`.
- **`formatResumeCommand` / `shellQuoteToken`** (`packages/core/src/resume-command.ts`) — Cursor: `cd <dir> && agent --resume=<id>`; Claude: `cd <dir> && claude --resume <id>`. Covered by `resume-command.test.ts`.
- **`packages/cli/src/source-filter.ts`** — parse/validate `--source`, cycle helper for interactive toggle.
- **`packages/cli/src/index.ts`** — `--source <cursor|claude|all>` (default `all`); applied on `--list-sessions`; `source` column in TSV and JSON; `--resume` uses `formatResumeCommand`; help documents `--source`.
- **`packages/cli/src/interactive.ts`** — `[cursor]` / `[claude]` row prefix; first menu row cycles source filter without leaving the tree; `-i` honors initial `--source`.

## Acceptance mapping

| AC | Status |
|----|--------|
| AC2.1 — `--source` filters list | Done via `filterSessions` + `sessionFilterForSource` |
| AC2.2 — Resume per source | Done via `formatResumeCommand` |
| AC2.3 — Interactive source visible + toggle | Done via prefix + toggle menu entry |
| AC2.4 — Help documents `--source` | Done via Commander option description |

## Deviations

None from the todo file list. Resume formatting lives in **core** (not only CLI) so unit tests reuse existing Vitest setup.

## Test gaps

Interactive inquirer flow is manual smoke-test only; filter and resume strings are automated in core.

## Branch

`feature/todo-1187`

## Commits

- `3d94ca1` — implementation plan
- `d0e53bc` — core filter + resume helpers
- `a4be548` — CLI wiring
