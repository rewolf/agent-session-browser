# TODO-1468: View conversation scroll to matched line (message search)

## Plan

| Piece | Approach |
|-------|----------|
| Plumbing | Optional `initialLineNumber` on `ViewConversationButton` and `SessionActionsCell`; `MessageSearchPanel` passes `h.lineNumber` per hit |
| Modal | `ConversationModal` accepts `initialLineNumber`; after load, `resolveMinimumFiltersForMessage` toggles tool/redacted filters once if the line would be hidden |
| Scroll | `data-line-number` on `.conversation-turn`; after `dialogItems` are ready, `scrollIntoView` in `.conversation-dialog`; brief `conversation-turn--highlight` class |
| Sidechain | If the line is a sidechain child, auto-expand the parent thread before scroll |
| Fallback | Missing line or empty transcript: open modal at default scroll (no throw) |
| Sessions list | No `initialLineNumber` — unchanged default scroll |
| Tests | `conversationDialogFilters.test.ts`, `ViewConversationButton.test.tsx`, `ConversationModal.test.tsx` (mocked fetch + scroll) |

## Acceptance mapping

1. Search row view → modal + scroll to `#lineNumber`.
2. Sessions list → no `initialLineNumber`.
3. Label stays **View conversation** only.
4. Hidden-by-filter turns → minimum filter enable, then scroll.
5. Unresolvable line → modal opens, default scroll.
6. Scroll after load / dialog items built.
7. Manual verification in browser (long session, multiple hits).

## Shipped

| Piece | Implementation |
|-------|----------------|
| Plumbing | `initialLineNumber` on `ViewConversationButton`, `SessionActionsCell`; `MessageSearchPanel` passes `h.lineNumber` |
| Filters | `conversationDialogFilters.ts` — `resolveMinimumFiltersForMessage`; modal bootstraps tool/redacted toggles once before scroll |
| Scroll | `data-line-number` on turns; `scrollIntoView` after `dialogItems` ready; `conversation-turn--highlight` (2.5s) |
| Sidechain | `sidechainParentUuidForLine` + `defaultSidechainOpen` on parent when hit is a child; scroll retries via `requestAnimationFrame` until the child `[data-line-number]` is in the DOM (avoids marking scroll done on first miss while the thread is still collapsed) |
| Fallback | Missing line: modal opens, no scroll, no error |
| Tests | `conversationDialogFilters.test.ts`, `ViewConversationButton.test.tsx`, `ConversationModal.test.tsx` (including sidechain child scroll), `MessageSearchPanel.test.tsx` (`initialLineNumber` on result actions) |

## Deviations

None.

## Review follow-up (send-back)

| Review point | Fix |
|--------------|-----|
| Sidechain child scroll race | Defer scroll with rAF retries when `sidechainParentUuidForLine` is set; include `sidechainParentToOpen` in scroll effect deps |
| Testing gaps | `ConversationModal` sidechain child → expand → scroll; `MessageSearchPanel` asserts `h.lineNumber` → `SessionActionsCell.initialLineNumber` |
