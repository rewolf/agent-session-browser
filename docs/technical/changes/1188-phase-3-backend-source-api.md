# TODO-1188 — Phase 3: Backend API source-aware endpoints

## Goal

All routes in `packages/backend/src/server.ts` accept optional `?source=cursor|claude|all` (default `all`). Sessions, nav tree, workspaces, conversation, and transcript search respect the filter.

## Approach

1. **`source-query.ts`** — Parse and validate `source` query param; map to `SessionFilter` via `sessionFilterForSource` (same semantics as CLI `source-filter.ts`).
2. **`browser-scope.ts`** — Given full `BrowserData`, filter sessions and rebuild `workspaces` + `navTree` from the filtered set so empty-source workspaces disappear (AC3.4).
3. **`server.ts`** — Apply scope on each endpoint; pass `source` to `loadSessionConversation` and `searchAgentTranscriptLines`; include `source` on serialized sessions (AC3.1).
4. **Tests** — Vitest unit tests for query parsing and browser scoping in `packages/backend` (core already covers `filterSessions` / search `source`).

## Acceptance criteria mapping

| AC | Implementation |
|----|----------------|
| AC3.1 | `GET /api/sessions?source=` → `filterSessions`; response includes `source` per row |
| AC3.2 | `GET .../conversation?source=` → `loadSessionConversation(id, source)`; omit → `findSessionById` then row's `source` |
| AC3.3 | `GET /api/transcript-search?source=` → filter sessions + `searchAgentTranscriptLines({ source })` |
| AC3.4 | `GET /api/tree`, `/api/workspaces` → scoped `BrowserData` |
| AC3.5 | Omitted `source` → `all` (both sources) |

## Shipped (implementation)

- **`packages/backend/src/source-query.ts`** — `parseSourceQuery`, `sessionFilterForSource` (mirrors CLI semantics).
- **`packages/backend/src/browser-scope.ts`** — `scopeBrowserData` rebuilds workspaces + nav tree from filtered sessions.
- **`packages/backend/src/server.ts`** — all five endpoints wired; `serializeSession` includes `source`; conversation treats `?source=all` like omitted; invalid `source` → 400.
- **Tests** — `source-query.test.ts`, `browser-scope.test.ts`; root `npm test` builds core then runs core + backend (matches `dev` script).

## Deviations

- `SessionFilter.source` and `filterSessions` were already in core from Phase 2; this todo only wired the HTTP layer.
- No HTTP-level supertest suite; parsing/scoping unit tests cover backend-specific logic (core tests cover `filterSessions` / search `source`).

## Out of scope

- Frontend source picker (later phase).
- Moving CLI `source-filter.ts` into core (optional follow-up).

## Test gaps

- Full HTTP integration against real `~/.cursor` / `~/.claude` dirs is manual; unit tests cover parsing and scoping logic.
- Root `npm test` must build `@csb/core` before backend Vitest (backend imports package `exports` → `dist/`); fixed in follow-up commit after review.

## Verification (follow-up)

- `npm run install:all && npm test` with `packages/core/dist` removed: **60 passed** (52 core + 8 backend), **0 failed**.
