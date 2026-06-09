# TODO-1364: Create favicon

## Problem

The Agent Session Browser web UI has no tab icon. `packages/frontend/index.html` sets the title but no `<link rel="icon">`, and there is no `public/` asset directory yet.

## Plan

1. Add `packages/frontend/public/` with favicon assets using the existing dark cyber palette from `index.css`:
   - `--bg` `#060a12`, `--accent` `#00d4ff`, `--accent-dim` `#005f8f`, `--border` cyan glow tones.
2. Motif: compact robot head with one magnifying-glass “eye” (agent + session browsing) — readable at 16×16 and 32×32 on light and dark browser chrome.
3. Formats: `favicon.svg` (primary), `favicon-16.png`, `favicon-32.png`, and `favicon.ico` (multi-size ICO for legacy browsers).
4. Reference icons from `index.html` per Vite `public/` conventions so dev and production builds serve them at `/`.
5. Manual check: load the UI and confirm the tab icon (hard refresh if cached).

## Out of scope

Header/wordmark redesign, CLI/backend icons, animated or theme-switching favicons.

## Verification

```sh
npm run build --prefix packages/frontend
npm run test --prefix packages/frontend
```

Manual: open dev or built UI in a browser and confirm the favicon in the tab.

## Shipped

- **`public/favicon.svg`**: primary vector icon — robot head with cyan glow on `#060a12`, one dot eye and one magnifying-glass eye (agent + browsing motif).
- **`public/favicon-16.png`**, **`public/favicon-32.png`**, **`public/favicon.ico`**: raster fallbacks generated from the SVG for crisp small sizes and legacy browsers.
- **`index.html`**: `<link rel="icon">` entries for SVG, PNG (16/32), and ICO per Vite `public/` conventions.
- **Palette**: `#060a12` background, `#00d4ff` accent strokes/fills, `#005f8f` mouth accent, `#0c1830` head fill — aligned with `index.css` tokens.
- **Commits**: `b6aed69` (plan), `0a4fccf` (implementation).
- **Deviations**: none; manual browser tab check left to reviewer (AC5).
