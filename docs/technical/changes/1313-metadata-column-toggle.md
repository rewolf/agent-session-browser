# TODO-1313: Metadata column visibility toggle

## Shipped

| Piece | Implementation |
|-------|----------------|
| Storage | `packages/frontend/src/columnVisibility.ts` — `asb.columns.metadata`, default `"hide"` |
| State | `useMetadataColumnVisible.ts` |
| UI | `ColumnVisibilityMenu.tsx` — columns icon, popover checkbox, Esc + Tab wrap, focus on open |
| Table | `SessionTable.tsx` omits metadata `ColumnDef` when hidden; extra header/body cell hosts the menu |
| Styles | `.column-visibility-*` in `index.css` using theme variables + `cyber-glow-border` on popover |
| Tests | `columnVisibility.test.ts`, extended `SessionTable.test.tsx` (default, show, toggle, chips harness) |
| Docs | `README.ui.md` session table section |

## Behaviour

- Fresh profile / cleared storage: no Metadata header or cells.
- Menu toggles show/hide immediately; preference persists in `localStorage`.
- Column removed from react-table defs when hidden (reflow).
- `MetadataFilterChips` unchanged; harness test confirms row filtering with column hidden.

## Deviations

None from plan.

## Out of scope (unchanged)

Provider descriptors, backend, auto-hide-when-empty, toggles for other columns.
