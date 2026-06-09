# TODO-1189 — Phase 4: Frontend source toggle, badge, source-aware resume

## Goal

UI shows session source (`Cursor` / `Claude`), filters all data views by source, persists filter in URL, and emits the correct resume shell command per source.

## Plan

1. **Types & API** — `SessionSource` on `ApiSession`; optional `source` query on `fetchTree`, `fetchWorkspaces`, `fetchSessions`, `fetchSessionConversation`, `fetchTranscriptSearch`.
2. **URL source filter** — `sourceFilter.ts`: parse/write `?source=cursor|claude` (omit = all); hook in `App` drives all fetches.
3. **SourceFilterControl** — Segmented control in app header (`All` | `Cursor` | `Claude`).
4. **SessionTable** — Source badge column; pass `source` to row actions.
5. **NavPanel** — Refetch tree when source filter changes.
6. **MessageSearchPanel** — Pass source to transcript search; show source on hits (backend adds `source` on search hits for resume when filter is `all`).
7. **Resume** — ~~`resumeCommand.ts` mirrors core~~ **Superseded by [1262](1262-open-session-source-union.md):** API `resumeCommand` per session; `AgentResumeButton` copies server-built string + display line break (`\\\n`); tooltips from `/api/providers`.
8. **ConversationModal** — Show source in header from prop.
9. **Tests** — Vitest in frontend for `formatDisplayResumeCommand` and URL source helpers.

## Acceptance mapping

| AC | Approach |
|----|----------|
| AC4.1 | `SourceBadge` column in `SessionTable` |
| AC4.2 | Shared `sourceFilter` in `App` → API + `NavPanel` + `MessageSearchPanel`; transcript search clears stale hits and auto re-runs when the query is non-empty |
| AC4.3 | URL `?source=` via `replaceState` |
| AC4.4 | `formatDisplayResumeCommand` + `AgentResumeButton` tooltips |
| AC4.5 | `ConversationModal` header badge |
| AC4.6 | Default `all`; empty Claude data when none — no throws |

## Test gaps

- No full-app e2e; `MessageSearchPanel` source-filter sync covered by Vitest + Testing Library; pure helpers (`sourceFilter`) have unit tests. Resume display covered by `AgentResumeButton.test.tsx` against API `resumeCommand` (1262).

## Shipped (implementation)

- **`sourceFilter.ts`** — URL `?source=cursor|claude`, helpers for API query mapping.
- **`SourceFilterControl`** — segmented control in app header; persists via `history.replaceState`.
- **`api.ts`** — `source` on sessions, tree, workspaces, conversation, transcript-search.
- **`SourceBadge`** — table column + conversation modal header.
- ~~**`resumeCommand.ts`**~~ — **Removed in 1262.** Resume strings come from the API; frontend only formats display (`\\\n` in `AgentResumeButton`).
- **`App` / `NavPanel` / `MessageSearchPanel`** — shared `sourceFilter` drives all fetches; `MessageSearchPanel` `useEffect` on `sourceFilter` clears stale hits and re-runs search when `messageQ` is non-empty (review follow-up, AC4.2).
- **`AgentResumeButton`** — per-source command and tooltip (AC4.4).
- **Backend** — `source` on transcript-search hit rows (needed for resume when filter is `all`).

## Deviations

- Did not add `@csb/core` as a frontend dependency — Vite would bundle Node-only modules. **1262** moved resume formatting to the backend (`formatResumeCommand` on session payloads) instead of a browser duplicate.

## Review follow-up (needs_work)

- **Issue:** Changing the header source filter left stale transcript-search rows until the user clicked Search again.
- **Fix:** `useEffect` on `sourceFilter` in `MessageSearchPanel` clears `hits` / `capped` / `error` and calls `runSearch()` when the message query is non-empty.
- **Tests:** `MessageSearchPanel.test.tsx` (2 cases) with `@testing-library/react` + jsdom.

## Commits

- `a105923` — implementation plan
- `49ba7c1` — UI, API client, backend search-hit `source`, Vitest
- `45c6869` — plan reconcile (initial review)
- `9c7f8bb` — transcript search source-filter sync + `MessageSearchPanel.test.tsx` + plan update
