# TODO-1467: Messages width settings in conversation modal

## Plan

| Piece | Approach |
|-------|----------|
| User turns | `margin-left: 20%` and `width: auto` on `.conversation-turn--user` so the block fills the right ~80% without overflowing |
| Assistant / system / other | Keep `.conversation-turn { width: 100% }`; no role-specific width override |
| Styling | Preserve existing user-turn border, gradient, and right-aligned header rules |
| Sidechains | Nested `.conversation-sidechain` stays inside the user turn box; child turns use normal role width rules within the thread |
| Verification | Manual: open a session with user and assistant messages in the conversation modal |

## Acceptance mapping

1. Assistant turns span full dialog content width (unchanged `width: 100%` on base `.conversation-turn`).
2. User turns right-justified via `margin-left: 20%` (~80% column on the right).
3. Existing user accent border, gradient, `.conversation-turn__head` alignment unchanged.
4. Toolbar, sidechain, and body layout remain inside the turn box (`box-sizing: border-box`).
5. Manual visual check in conversation modal.

## Shipped

| Piece | Implementation |
|-------|----------------|
| User turns | `margin-left: 20%` and `width: auto` on `.conversation-turn--user` in `packages/frontend/src/index.css` |
| Other roles | Base `.conversation-turn { width: 100% }` unchanged for assistant, system, and other |
| Verification | `npm test` (all packages); manual check in conversation modal recommended |

## Deviations

None.
