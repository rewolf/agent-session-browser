# TODO-1338: Fix session filter bar date-row layout

## Problem

Todo 1314 introduced a two-row `SessionFilterBar`. The date row used CSS grid (`auto minmax(0, 1fr) auto minmax(0, 1fr)`), which placed children in source order incorrectly: the `→` separator landed in a stretching `1fr` column, leaving large gaps between FROM, separator, and TO.

## Plan

1. Switch `.session-filter-bar__date-row` from `display: grid` to `display: flex` with `flex-wrap: wrap`, `align-items: end`, `gap: 0.65rem 0.75rem`.
2. Change `.session-filter-bar__date-header` from `grid-column: 1 / -1` to `flex-basis: 100%`.
3. Add regression test in `SessionFilterBar.test.tsx`: DOM child order `[header, FROM label, separator, TO label]` and computed `display: flex` on the date row.

## Verification

```sh
cd packages/frontend && npm test -- SessionFilterBar
npm run build && npm run test
```

## Shipped

| Piece | Implementation |
|-------|----------------|
| CSS | `.session-filter-bar__date-row` — `display: flex`, `flex-wrap: wrap`, `align-items: end`, `gap: 0.65rem 0.75rem`; removed `grid-template-columns` |
| CSS | `.session-filter-bar__date-header` — `flex-basis: 100%` (replaces `grid-column: 1 / -1`) |
| Tests | `SessionFilterBar.test.tsx` — asserts date-row child order: header, From label, `→` separator, To label |
| Commits | `615df4d` (plan), `70894b5` (implementation) |

## Deviations

Regression test uses DOM child-order assertions only (jsdom does not apply imported CSS for `getComputedStyle`); satisfies AC4 without a stylesheet snapshot.
