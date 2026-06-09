# TODO-1557: Replace body background

## Problem

The page body uses a dual `linear-gradient` grid pattern. The updated visual design calls for a radial gradient glow instead.

## Plan

1. In `packages/frontend/src/index.css`, on the `body` selector:
   - Set `background-image` to `radial-gradient(rgba(0, 212, 255, 0.095), transparent)`.
   - Set `background-size` to `50vw 50vh`.
2. Leave all other `body` properties unchanged (`background-color: var(--bg)`, typography, etc.).
3. Do not modify `.cyber-glow-border`, panels, or other component gradients.

## Verification

```sh
npm run build
```

Manual: `npm run dev` from repo root and confirm the radial glow renders on the page body.

## Shipped

- **`packages/frontend/src/index.css`**: On `body`, replaced dual `linear-gradient` grid with `background-image: radial-gradient(rgba(0, 212, 255, 0.095), transparent)` and `background-size: 50vw 50vh`. All other `body` properties unchanged.
- No deviations from plan; CSS-only visual tweak with no component or design-system doc updates.
