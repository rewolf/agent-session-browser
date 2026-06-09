# TODO-1363: Bookmarks and aliases

## Shipped

| Piece | Implementation |
|-------|----------------|
| Storage | `sessionAnnotations.ts` — `asb.sessionAnnotations`, keyed `${source}:${sessionId}` with `{ bookmarked?, alias? }` |
| Starred filter pref | `starredOnlyFilter.ts` — `asb.filters.starredOnly` |
| Hook | `useSessionAnnotations.ts` |
| Client filters | `sessionClientFilter.ts` — name/id/alias text match, starred-only filter |
| Star column | `BookmarkButton.tsx` + leading column in `SessionTable.tsx` |
| Alias cell | `SessionNameCell.tsx` — display rules, pencil + inline edit |
| Filter bar | `SessionFilterBar.tsx` — **Starred only** checkbox on text row |
| App wiring | `App.tsx` — omits server `q`; applies text/starred filters client-side on fetched rows; bookmark-first sort when starred-only off |
| Styles | `.session-bookmark-*`, `.session-name-cell*`, `.session-filter-bar__starred` in `index.css` |
| Tests | `sessionAnnotations.test.ts`, `sessionClientFilter.test.ts`, `starredOnlyFilter.test.ts`, extended `SessionTable.test.tsx` (incl. Escape cancel), `SessionFilterBar.test.tsx` |
| Docs | `README.ui.md` sessions + filters sections |

## Behaviour

- Star toggles persist immediately; orphaned annotation keys may remain when sessions disappear from scans.
- **Starred only** filters the loaded table instantly (no refetch); preference persists across reloads.
- Name/ID search runs client-side after **Refresh** so aliases match even when the provider name/id do not (server `q` omitted).
- Bookmark sort prepends a hidden bookmark sort key when **Starred only** is off; user column sort applies within bookmark groups.
- Alias inline edit: Enter or blur saves; Escape cancels without persisting draft (`cancelingRef` skips blur commit after Escape).

## Review follow-up

- **Correctness (AC6):** `SessionNameCell` used `onBlur={commit}`; Escape unmounted the input and blur still saved the draft. Fixed with `cancelingRef`; `SessionTable.test.tsx` covers Escape cancel.

## Deviations

- Text filter moved fully client-side (server `q` no longer sent) so alias-only matches work without a backend annotation store.

## Out of scope (unchanged)

CLI list, export/import, URL starred param, message search/modal alias, backend changes.
