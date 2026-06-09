# TODO-1341: Fix Claude conversation modal parsing & rendering parity

## Problem

`extractContentBlocks` assumes `message.content` is always an array (Cursor shape). Claude JSONL often uses a string for user turns and `thinking` blocks on assistant turns. String content returns `[]`, so `parseJsonlConversationLine` falls back to dumping raw JSONL. `thinking` blocks fall through to `other` and render the opaque `signature` blob.

## Plan

1. **Core** (`transcript-conversation.ts`): If `message.content` is a string, emit one `text` block (with `stripUserQueryTags`). Add `TranscriptThinkingBlock` (`type: "thinking"`, `thinking` field only). Skip empty text/thinking. No provider checks.
2. **Tests**: Fixtures for (a) Claude string user turn, (b) Claude `thinking` assistant block, (c) Cursor array-content golden blocks snapshot.
3. **Frontend**: Extend block union; render thinking as collapsible muted section; update `messageCopyText`. CSS in `index.css`.
4. Verify `npm run build` and `npm run test`.

## Verification

```sh
npm run build && npm run test
```

## Shipped

| Piece | Implementation |
|-------|----------------|
| Core | `extractContentBlocks` — string `message.content` → `text` block; `thinking` → `{ type: "thinking", thinking }` (signature ignored); skip empty |
| Types | `TranscriptThinkingBlock` in core union and frontend `types.ts` |
| UI | `ConversationModal` — collapsible “Thinking…” (`details`/`summary`) in rich mode; muted italic styling in `index.css` |
| Copy | `messageCopyText` prefixes thinking with `Thinking` label |
| Tests | `transcript-conversation.test.ts` — Claude string user turn, thinking block, Cursor array golden snapshot |
| Commits | `e6c34a2` (plan), `f2fcf26` (implementation) |

## Deviations

None. Cursor array-content path unchanged; golden inline snapshot guards regression.
