# TODO-1469: Search messages in conversation modal

## Plan

| Piece | Approach |
|-------|----------|
| Find logic | `conversationFind.ts` — case-insensitive substring per visible block (`blockCopyText` aligned with `messageCopyText`); walk top-level `dialogItems` order then sidechain children (chronological); skip redacted-gap bubbles |
| UI | Toolbar find field + clear, Next/Previous, match counter (`aria-live`); patterns from `FilterInputWithClear` |
| Highlights | `HighlightText` wraps matches in `<mark>` with `data-find-match-index`; active match uses `--accent` |
| Sidechain | Matches on collapsed sidechain set `sidechainParentToOpen`; scroll active mark into view |
| Escape | Clear/blur find when query or find focus active; else close modal |
| Tests | `conversationFind.test.ts`, `ConversationModal.test.tsx` (find, wrap, filters, sidechain, escape) |

## Acceptance mapping

1. Toolbar find control when transcript has messages.
2. Client-side only on loaded conversation.
3. Case-insensitive substring (Message search parity).
4. `blockCopyText` / `messageCopyText` block semantics.
5. Respects tool/redacted toggles via `blocksForDisplay`.
6. Sidechain messages included; collapsed sidechain expands on navigate.
7. Match order follows `dialogItems` + nested sidechain order.
8. All matches highlighted; active distinct.
9. Counter shows active/total (accessible).
10. Next/Previous wrap.
11. Zero matches: 0 indicator, no highlights, nav disabled.
12. Clear query resets highlights/state.

## Shipped

| Piece | Implementation |
|-------|----------------|
| Find logic | `conversationFind.ts` — `collectConversationFindMatches`, `groupFindMatchesByLine`, `wrapFindIndex` |
| Copy text | `blockCopyText` in `messageContent.ts` (shared with `messageCopyText`) |
| Highlights | `HighlightText.tsx` — `<mark>` with `data-find-match-index`; active uses `--accent` |
| UI | `ConversationFindBar` in `ConversationModal.tsx` — search input, clear, Previous/Next, `aria-live` counter |
| Sidechain | `sidechainParentToOpen` when active match has `parentUuid`; scroll retries until mark is in DOM |
| Escape | Clears query / blurs find first; closes modal when find is inactive |
| Styles | `index.css` — `.conversation-modal__find*`, `.conversation-find__mark*` |
| Tests | `conversationFind.test.ts`, `ConversationModal.test.tsx` (find, wrap, escape, sidechain) |

## Deviations

- Rich text blocks render plain highlighted text while find is active (markdown disabled for matched text blocks) so highlights align with searchable plain text.
