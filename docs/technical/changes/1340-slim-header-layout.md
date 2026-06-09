# TODO-1340: Slim top-card header

## Problem

The header card stacks four vertical elements (title, stale tagline, source filter with redundant label, tabs). This wastes vertical space before session data. The tagline references Cursor-only concepts; tabs belong between cards, not inside the header panel.

## Plan

1. **`App.tsx`**: Remove tagline; reorder header to `SourceFilterControl` left + `<h1>` right; move `<nav className="app-tabs">` to a sibling after `</header>`.
2. **`SourceFilterControl.tsx`**: Remove `source-filter__label` span from loading, error, and normal paths (keep `aria-label` on the group).
3. **`sourceFilter.ts`**: Display label `"All"` → `"All Agents"`; internal `SourceFilter` value unchanged.
4. **`index.css`**: Flex row on `.app-header`; flush source filter (no top margin); symmetric `.app-tabs` vertical margins; remove unused `.tagline` / `.source-filter__label` rules; zero header bottom margin so tab margins define the inter-card gap.
5. **Tests**: Update `SourceFilterControl.test.tsx` for `"All Agents"`; add `App.test.tsx` for DOM structure (tabs sibling of header, no tagline).

## Verification

```sh
npm run build && npm run test
grep -n 'tagline\|Read-only\|local Composer data\|CURSOR_USER_DIR' packages/frontend/src
grep -n '>Source<' packages/frontend/src/SourceFilterControl.tsx
```

## Shipped

- **`App.tsx`**: Header is a single flex row — `SourceFilterControl` left, `<h1>` right; tagline removed; `<nav className="app-tabs">` moved to a sibling after `</header>`.
- **`SourceFilterControl.tsx`**: Removed visible `Source` label from loading, error, and normal paths; `aria-label="Session source filter"` retained on the group.
- **`sourceFilter.ts`**: Display label `"All"` → `"All Agents"`; internal `SourceFilter` value unchanged.
- **`index.css`**: `.app-header` flex row with `margin-bottom: 0`; `.app-tabs` symmetric `0.75rem` vertical margins; removed `.tagline` and `.source-filter__label` rules; source filter no longer has top margin.
- **Tests**: `App.test.tsx` (tabs sibling of header, no tagline); `SourceFilterControl.test.tsx` and `sourceFilter.test.ts` updated for `"All Agents"`.
- **Commits**: `5772d3e` (plan), `194aafb` (implementation).
- **Deviations**: none.
