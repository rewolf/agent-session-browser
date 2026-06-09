# TODO-1310: Provider abstraction readiness

## Goal

Evolve `SessionProvider` so future async, auth-gated, or non-filesystem sources can be added without further backend/frontend/CLI contract changes. Filesystem providers (`cursor`, `claude`) remain behaviorally identical.

## Contract changes (`@csb/core`)

| Surface | Change |
|---------|--------|
| `scanSessions()` | Returns `Promise<ScanResult>` with optional `unavailable` instead of throwing / empty lists |
| `healthCheck?()` | Optional lightweight usability probe |
| `workspaceGrouping` | `"fs-path"` \| `"external-id"` \| `"none"` — drives nav tree builder |
| `primaryActions?(session)` | Shell and URL actions; default wraps `formatResumeCommandTail` as `{ id: "resume", label: "Resume", command }` |
| `withScanCache(provider, ttlMs)` | Opt-in TTL wrapper for expensive scans |

## Migration (built-in providers)

- `scan()` renamed to `scanSessions()` (async, wraps existing sync scan logic).
- `healthCheck` returns `{ ok: true }` under normal conditions.
- `workspaceGrouping: "fs-path"`.
- `primaryActions` via shared default helper from resume tail.

## API / UI / CLI

- `GET /api/providers` — descriptors include `healthStatus`, `workspaceGrouping`.
- `GET /api/sessions` — top-level `unavailable[]` per provider.
- Frontend — health on source chips, unavailable banner, `primaryActions` buttons (descriptor-driven).
- CLI — `csb providers`; `list` stderr warnings; `resume --exec` uses command-bearing `primaryActions` entry.

## Tests

Fake providers in core/backend/frontend unit tests (no third real provider). Covers unavailable propagation, grouping modes, cache TTL, and `--exec` action selection.

## Shipped (feature/todo-1310)

- Core: `scanSessions()`, `ScanResult.unavailable`, `healthCheck`, `workspaceGrouping`, `primaryActions` default via `resolvePrimaryActions`, `withScanCache`.
- API: `GET /api/providers` includes `healthStatus` + `workspaceGrouping`; `GET /api/sessions` includes `unavailable[]`; sessions expose `primaryActions`.
- CLI: `csb providers`; `csb list` (alias) stderr warnings; `--resume --exec` uses command-bearing primary action.
- UI: unavailable banner, provider health on source chips (count `—` when unavailable), multi-action row buttons.
- Docs: `README.md` “Adding a provider”; `README.ui.md` Features + API (review follow-up).
- Tests: fakes in `test-fakes.ts` + contract/nav/backend/cli coverage; built-in provider behaviour unchanged.
