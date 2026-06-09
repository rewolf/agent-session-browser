# TODO-1262: Open SessionSource union and drop Cursor fallbacks

## Scope

Widen `SessionSource` to a registry-validated string, remove `getProviderOrDefault` and frontend resume duplication, serve `resumeCommand` from the backend, and prove a stub `amp` provider works without edits to backend/CLI/frontend dispatchers.

## Acceptance criteria mapping

| AC | Plan |
|----|------|
| AC1 | `export type SessionSource = string` in core + frontend `types.ts` |
| AC2 | Registry-based parsing; no `=== "cursor"` / `=== "claude"` outside provider impls |
| AC3 | `parseSourceQuery` / `parseSourceOption` use `defaultProviderRegistry().ids()` + `all` |
| AC4 | Delete `getProviderOrDefault` |
| AC5 | `formatResumeCommand` throws `Unknown session source`; unit test |
| AC6 | `resumeCommand` on `serializeSession` + transcript-search hits; integration test |
| AC7 | Delete `resumeCommand.ts`; `AgentResumeButton` uses API field |
| AC8 | No `shellQuoteToken` in frontend |
| AC9 | CLI picker `[${s.source}]` |
| AC10 | Neutral CLI empty-workspace message |
| AC11 | Amp stub tests (core existing + backend/CLI source-filter with mocked/extra registry) |
| AC12 | `npm run test` green |

## Implementation slices

1. Core: types, `source-filter.ts`, `formatResumeCommand` throw, remove `getProviderOrDefault`
2. Backend + CLI: registry validation; `resumeCommand` on session payloads
3. Frontend: types, delete `resumeCommand.ts`, wire `AgentResumeButton`
4. Tests + reconcile this doc

## Shipped

- **`SessionSource`** is `string` in `packages/core` and `packages/frontend` types.
- **`packages/core/src/source-filter.ts`** — shared `parseSourceFilter` / `parseSourceQueryParam` / `formatAcceptedSourceList`; exported from `@csb/core`.
- **`getProviderOrDefault`** removed; **`formatResumeCommand`** uses `registry.get()` and throws `Unknown session source: …`.
- **Backend** `parseSourceQuery` and **CLI** `parseSourceOption` validate against `defaultProviderRegistry().ids()`; error messages list registry ids.
- **`serializeSession`** and transcript-search hits include **`resumeCommand`**; integration test in `sessions-route.test.ts`.
- **Frontend** `resumeCommand.ts` deleted; **`AgentResumeButton`** takes API `resumeCommand`; display `\\\n` stays in the button component.
- **CLI** interactive picker uses `[${s.source}]`; empty tree message is source-neutral.
- **Tests:** `source-filter-amp.test.ts` (backend), `source-filter.test.ts` (CLI), existing amp stub in `provider.test.ts`; CLI package added to root `npm run test`.

## Deviations

- **`SessionTable`** still gates metadata badges with `row.source !== "claude"` (ticket 07 — descriptor-driven metadata UI).
- **CLI** gained `vitest` and a `test` script so amp source-filter coverage runs under `npm run test` (not required by AC but keeps AC12 honest for CLI).

## Review follow-up (documentation)

Addressed `needs_work` documentation gaps:

- **`README.ui.md`** — source filter in Features; API docs for `source`, `resumeCommand`, `?source=`, `GET /api/providers`.
- **`README.cli.md`** — `--source` (registry ids + `all`); `--resume` / interactive resume describe provider-specific `formatResumeCommand` output.
- **`docs/technical/session-sources.md`** — registry / open `SessionSource` / backend-owned `resumeCommand` section.
- **`docs/technical/changes/1189-phase-4-frontend-source-ui.md`** — resume bullets superseded (frontend no longer mirrors core).
