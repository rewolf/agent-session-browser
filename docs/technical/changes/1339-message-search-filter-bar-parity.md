# TODO-1339: Message search filter bar visual parity

## Shipped

| Piece | Implementation |
|-------|----------------|
| Layout | `MessageSearchPanel.tsx` — reuses `.session-filter-bar*` classes; date row ("Scan sessions by" toggle + From → To), text row (Message, Workspace, Role), tall Search anchor on the right |
| Date mode | `msgSearchDateMode.ts` — `asb.msgSearch.dateMode`, default `"updated"`; independent from `asb.filters.dateMode` |
| Clear inputs | Exported `FilterInputWithClear` from `SessionFilterBar.tsx`; used for Message, Workspace, Role |
| Search button | Reuses `.session-filter-bar__refresh` + `--loading`; disabled when Message text empty or fetch pending |
| Legacy CSS | Removed `.field.date-scope` and `.field.field-actions` from `index.css` |
| Tests | `MessageSearchPanel.test.tsx` — toggle/persistence, cross-component localStorage isolation, clear buttons, disabled/enabled Search, loading pulse, payload parity |

## Behaviour

- Date-mode preference persists across reload under `asb.msgSearch.dateMode`; does not affect session list filters.
- Search disabled until Message text is non-empty; empty-query error path removed.
- Loading state disables Search and applies pulsing glow animation.
- Toggle cycles Created/Updated; applied on next Search submit (no auto-fetch on toggle).

## Deviations

None from plan.

## Plan (original)

Apply the SessionFilterBar visual language (TODO-1314) to `MessageSearchPanel`:

| Piece | Approach |
|-------|----------|
| Layout | Reuse `.session-filter-bar*` classes — date row (toggle header + From → To), text row (Message, Workspace, Role), tall outlined Search anchor on the right |
| Date mode | New `msgSearchDateMode.ts` — `localStorage["asb.msgSearch.dateMode"]`, default `"updated"`; header wording "Scan sessions by \<Created\|Updated\>" |
| Clear inputs | Import exported `FilterInputWithClear` from `SessionFilterBar.tsx` |
| Search button | Reuse `.session-filter-bar__refresh` + `--loading`; disabled when Message text is empty |
| Legacy CSS | Remove `.field.date-scope` and `.field.field-actions` (MessageSearchPanel-only) |
| Tests | Extend `MessageSearchPanel.test.tsx` — toggle/persistence, isolation from session filters, clear buttons, disabled/enabled Search, loading pulse |

## Non-goals

Search algorithm, result table, filter dimensions, backend payload, SessionFilterBar changes.

## Acceptance mapping

1. Two-row layout + anchor Search — `MessageSearchPanel.tsx` structure mirrors `SessionFilterBar`.
2. Date row flex — same `session-filter-bar__date-row` classes.
3. Toggle-on-click + `asb.msgSearch.dateMode` — `msgSearchDateMode.ts` + panel state.
4. Clear buttons — `FilterInputWithClear` on Message, Workspace, Role.
5. Search disabled/loading — button `disabled={!messageQ.trim() \|\| loading}`; `--loading` class while fetch pending.
6. Remove radio group and legacy wrappers/classes.
7. Functional parity — `runSearch` payload unchanged; empty-query error path removed.
8. Theming — existing CSS variables only.
9. Accessibility — aria-labels on toggle, Search, Clear.
10. Tests — as listed in plan table + cross-component localStorage isolation.
