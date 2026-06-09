# TODO-1558: Auto size user bubbles

## Plan

| Piece | Approach |
|-------|----------|
| User turns | Replace `margin-left: 20%` with `margin-left: auto`, `width: fit-content`, and `max-width: 80%` on `.conversation-turn--user` so short messages shrink to content while staying right-aligned |
| Right alignment | Block-level `margin-left: auto` in `.conversation-dialog` pushes the fit-content bubble to the right edge |
| Long messages | `max-width: 80%` preserves the prior ~80% right-column cap from TODO-1467 |
| Other roles | Base `.conversation-turn { width: 100% }` unchanged for assistant, system, and other |
| Styling | Preserve user-turn border, gradient, right-aligned header, toolbar, and sidechain layout |
| Verification | `npm test` (all packages); manual check for short vs long user messages in conversation modal |

## Acceptance mapping

1. Short user turns size to content — no fixed left margin reserving empty space.
2. User bubbles remain right-aligned in the dialog.
3. Long user messages capped at ~80% dialog width; no overflow.
4. Assistant, system, and other turns unchanged at full width.
5. User accent border, gradient, header alignment preserved.
6. Nested sidechain threads render inside the resized user bubble.
7. All tests pass.

## Shipped

| Piece | Implementation |
|-------|----------------|
| User turns | `margin-left: auto`, `width: fit-content`, `max-width: 80%` on `.conversation-turn--user` in `packages/frontend/src/index.css` |
| Other roles | Base `.conversation-turn { width: 100% }` unchanged for assistant, system, and other |
| Verification | `npm test` (all packages, 223 tests); manual check in conversation modal recommended |

## Deviations

None. CSS-only change as planned; no markup changes required.
