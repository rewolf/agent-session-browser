# TODO-1317: Allowlist http(s) for primaryActions URL links

## Plan

- Add `isSafeHttpUrl()` using `new URL()`; allow only `http:` / `https:` (case-insensitive); reject malformed, relative, and scheme-relative URLs.
- Gate `<a href>` rendering in `SessionPrimaryActions` on that helper; omit rejected URL actions (no anchor with raw provider value).
- Add `SessionPrimaryActions.test.tsx` for allowed/rejected schemes and DOM absence of unsafe links.
- Document in `README.md` provider hook table and `docs/technical/session-sources.md` that URL actions must be absolute `http:` / `https:` only.

## Shipped

- **`packages/frontend/src/safeHttpUrl.ts`** — `isSafeHttpUrl()` uses `new URL()`; allows only `http:` / `https:` (case-insensitive); malformed and relative URLs throw and return false.
- **`SessionPrimaryActions.tsx`** — URL actions render `<a>` only when `isSafeHttpUrl` passes; rejected URLs are omitted (same as missing command/url).
- **`SessionPrimaryActions.test.tsx`** — Covers https/http links, `javascript:` / `data:` / `file:` rejection, scheme-relative and relative paths, and command actions alongside filtered URLs.
- **Docs** — `README.md` hook table and `docs/technical/session-sources.md` state URL actions must be absolute `http:` / `https:` only.

No shared `@csb/core` helper or API-side filtering (out of scope per todo).
