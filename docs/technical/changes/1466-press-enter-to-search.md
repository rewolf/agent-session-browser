# TODO-1466: Press Enter to run Refresh / Search transcripts

## Plan

| Piece | Approach |
|-------|----------|
| Shared submit | `submitFilterPanel` in `SessionFilterBar.tsx` — `preventDefault`, call action only when the primary button would not be `disabled` |
| Sessions tab | Wrap `SessionFilterBar` filter content + Refresh in `<form onSubmit>`; Refresh `type="submit"` |
| Message search | Same pattern in `MessageSearchPanel`; Search `type="submit"` |
| Layout | `.session-filter-bar__form { display: contents }` so existing section grid is unchanged |
| Native controls | Checkbox, date-mode toggles, and clear buttons remain `type="button"` (no Enter override) |
| Tests | Enter in Name/ID (sessions) and Message text (search) — fires handler when enabled, not when disabled |

## Acceptance mapping

1. Sessions Enter in workspace, Name/ID, From/To, metadata text — `onRefresh` when `!refreshDisabled && !loading`.
2. Message search Enter in Message, Workspace, Role, From/To — `runSearch()` when `!searchDisabled`.
3. No spurious calls — submit handler mirrors button `disabled` logic.
4. Checkbox / toggles / clear — unchanged `type="button"` or native checkbox behavior.
5. Tests — `SessionFilterBar.test.tsx`, `MessageSearchPanel.test.tsx`.

## Shipped

| Piece | Implementation |
|-------|----------------|
| Shared submit | `submitFilterPanel` in `SessionFilterBar.tsx` |
| Sessions | `<form className="session-filter-bar__form">` + Refresh `type="submit"` |
| Message search | Same form pattern; Search `type="submit"` |
| Layout | `display: contents` on `.session-filter-bar__form` in `index.css` |
| Tests | Enter in Name/ID and Message text — enabled vs disabled cases |

## Deviations

None.
