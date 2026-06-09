# TODO-1337: Fix on-page brand heading

## Problem

Todo 1316 renamed machine identifiers (`cursor-session-browser`, `csb`) but missed the human-readable on-page `<h1>` (`Cursor session browser`). The browser tab title was already `Agent Session Browser`.

## Plan

1. Add `packages/frontend/src/branding.ts` exporting `APP_NAME = "Agent Session Browser"`.
2. Use `APP_NAME` in `App.tsx` `<h1>` and set `document.title` from `main.tsx` (keeps runtime title aligned with the constant; `index.html` remains the static pre-JS fallback).
3. Unit test `branding.ts` so renames have a single source of truth.

## Prevention (audit grep)

After future renames, run in repo root (excludes historical change docs and the todo-manager tag):

```sh
grep -rn -i -E "cursor[ -]session[ -]browser" \
  --include='*.ts' --include='*.tsx' --include='*.json' \
  --include='*.html' --include='*.md' --include='*.css' \
  . | grep -v node_modules | grep -v "\.git/" | grep -v dist \
    | grep -v "docs/technical/changes/" \
    | grep -v -E "^\./[0-9]+-" \
    | grep -v -E "^\./cli-0[0-9]-" \
    | grep -v "app:cursor-session-browser"
```

Must return no results.

## Verification

```sh
npm run build && npm run test
```

Plus the grep above and AC3 provider-only `Cursor` check in `packages/frontend/src`.

## Shipped

- **`branding.ts`**: `APP_NAME = "Agent Session Browser"` — single source for display name.
- **`App.tsx`**: `<h1>{APP_NAME}</h1>` (was `Cursor session browser`).
- **`main.tsx`**: `document.title = APP_NAME` at startup (aligns runtime title with `index.html`).
- **`branding.test.ts`**: asserts `APP_NAME` value.
- **Commits**: `a46405b` (plan), `1b05441` (implementation).
- **Deviations**: none; optional `index.html` build-time injection skipped — static title already correct and matches `APP_NAME`.
