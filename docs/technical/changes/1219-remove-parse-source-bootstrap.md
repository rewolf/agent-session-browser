# TODO-1219 — Remove cursor/claude bootstrap in parseSourceFromSearch

## Goal

Deep-link `?source=` values must only apply when the id appears in `availableIds` from the provider registry. Pre-registry parsing must not special-case `"cursor"` or `"claude"`; unknown ids resolve to `"all"` until `providerIds` are supplied.

## Plan

1. **Remove bootstrap** — Delete the `availableIds.length === 0 && (raw === "cursor" || raw === "claude")` branch in `parseSourceFromSearch`; when `availableIds` is empty, return `"all"` for any `?source=` value.
2. **Simplify logic** — Single path: accept `raw` only when `availableIds.includes(raw)`; otherwise `"all"`.
3. **Tests** — Add `sourceFilter.test.ts` cases: empty `availableIds` with `?source=cursor`, `?source=claude`, `?source=amp` all expect `"all"`; keep existing non-empty id list tests.
4. **App** — No change required: initial `useState` already calls `parseSourceFromSearch(search)` without ids; existing `useEffect` on `providerIds` re-parses when the registry loads.

## Acceptance mapping

| AC | Approach |
|----|----------|
| No cursor/claude bootstrap when ids empty | Remove lines 17–18; grep clean |
| Deep link before descriptors | Empty ids → `"all"`; `useEffect` applies filter after load |
| Known id after registry | Existing tests + unchanged non-empty branch |
| No regression for explicit lists | Existing unit tests unchanged |
| AC7 alignment | No new hardcoded provider ids in `sourceFilter.ts` |

## Testing

- `packages/frontend` Vitest: `sourceFilter.test.ts`
- App re-parse: covered by existing `App.tsx` `useEffect`; no new App test (manual/doc only if needed)

## Risks

- Brief moment on first paint shows "All" even when URL has `?source=amp` until providers load; then effect sets correct filter (intended per AC).

## Shipped

- `packages/frontend/src/sourceFilter.ts` — `parseSourceFromSearch` returns `"all"` when `availableIds` is empty or `raw` is not listed; removed cursor/claude bootstrap (no provider id literals in this module).
- `packages/frontend/src/sourceFilter.test.ts` — new describe case for empty `availableIds` with `cursor`, `claude`, and `amp`.
- `packages/frontend/src/App.tsx` — unchanged; `useEffect` on `providerIds` still re-parses the URL after registry load.

## Deviations

- None from plan.
