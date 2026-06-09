# TODO-1358: Expand README.ui.md Message search filters section

## Plan

Documentation-only follow-up to TODO-1339. Expand the **Message search** bullet in `README.ui.md` to operator-facing depth matching the adjacent **Sessions filters** bullet (TODO-1314 precedent).

| Piece | Approach |
|-------|----------|
| Target | `README.ui.md` — **Features** → **Message search** bullet |
| Style anchor | Mirror structure and density of **Sessions filters** on the same page |
| Filter bar | Two-row layout: date row (**Scan sessions by** + Created/Updated toggle, From → To); text row (Message, Workspace, Role); tall outlined **Search transcripts** on the right |
| Clear controls | Inline `✕` on Message, Workspace, Role (`FilterInputWithClear` pattern) |
| Search gating | Disabled until Message text is non-empty (trimmed); disabled while fetch in flight (loading / pulse) |
| Date mode | `localStorage` key `asb.msgSearch.dateMode` (default `updated`); independent from `asb.filters.dateMode`; toggle does not auto-run search |
| Preserve | Existing API/summary facts (JSONL substring search, scoping, hit cap, `source` / `resumeCommand` on hits) |
| Cross-ref | Brief pointer to `docs/technical/changes/1339-message-search-filter-bar-parity.md` for implementer matrix |

## Out of scope

Code, CSS, API, tests, Sessions filters bullet rewrites, expanding the TODO-1339 change note.

## Acceptance mapping

1. Depth parity with **Sessions filters** — expanded single bullet under **Features**.
2. Two-row filter bar documented with **Search transcripts** anchor.
3. Inline clear on Message, Workspace, Role.
4. Search disabled rules (empty trimmed text, in-flight loading).
5. `asb.msgSearch.dateMode` persistence, default `updated`, not shared with session filters.
6. Date-mode change applies on next submit only.
7. Prior Message search facts retained.
8. Cross-reference to TODO-1339 change note only (no full matrix duplication).

## Shipped

| Piece | Implementation |
|-------|----------------|
| README | `README.ui.md` — expanded **Message search** bullet under **Features** |
| Filter bar | Two-row layout, **Search transcripts** anchor, inline clear on Message/Workspace/Role |
| Date mode | `asb.msgSearch.dateMode`, default `updated`, independent from session filters; no auto-search on toggle |
| Search gating | Disabled until trimmed Message text non-empty; disabled while in-flight (loading / pulse) |
| Cross-ref | Pointer to `docs/technical/changes/1339-message-search-filter-bar-parity.md` |
| Preserved | JSONL substring search, scoping dimensions, hit cap, `source` / `resumeCommand` on hits |

## Deviations

None from plan.
