# TODO-1567: Session table excerpt sub-row and column sizing

## Shipped

| Piece | Implementation |
|-------|----------------|
| Backend excerpt | `deriveSessionExcerpt` in `session-response.ts` — `findTranscriptFile` + `deriveSessionTitleFromJsonl`; `excerpt` on serialized payload |
| Frontend type | `ApiSession.excerpt?: string \| null` in `types.ts` |
| Sub-row | `SessionTable.tsx` — second `<tr>` with colspan from ID through visibility when excerpt present; `session-row--has-excerpt` drops main-row bottom border |
| ID column | `.session-id` — `white-space: nowrap` (replaces `word-break: break-all`) |
| Dates | `.date-cell` with `white-space: nowrap` on Created/Updated cells |
| Styles | `.session-excerpt-row`, `.session-excerpt` — muted, smaller font, nowrap + ellipsis |
| Tests | `session-response.test.ts` (excerpt derived / null); `SessionTable.test.tsx` (sub-row present / absent) |

## Behaviour

- Excerpt uses the same ≤80-char single-line helper as session titles; mtime-cached per JSONL path.
- Sub-row spans bookmark+source empty cells, then one colspan cell from ID through the trailing visibility column.
- Rows without a derivable first user message omit the sub-row and keep the normal row border.

## Open decision (unchanged)

Claude sessions may duplicate Name and excerpt text (both from first user message). Shipped as-is; suppress-on-duplicate deferred unless review requests it.

## Documentation (review follow-up)

- `README.ui.md` — **Sessions** describes excerpt sub-row, nowrap ID/date layout; **API** documents `excerpt` and `metadata` on session rows.
- `docs/technical/session-sources.md` — session list excerpt bullet + cross-link from `deriveSessionTitleFromJsonl` note.

## Deviations

None.
