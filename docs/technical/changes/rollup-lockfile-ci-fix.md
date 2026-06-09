# Rollup optional-deps lockfile CI fix

## Problem

Regenerating package lockfiles on Linux only (during the min-release-age lockfile refresh) dropped lockfile entries for `@rollup/rollup-darwin-*` and `@rollup/rollup-win32-*` optional packages. CI failed on macOS and Windows with:

```
Cannot find module @rollup/rollup-darwin-arm64
Cannot find module @rollup/rollup-win32-x64-msvc
```

Rollup is pulled in by **Vite** (`packages/frontend`) and **Vitest** (`packages/core`, `packages/cli`, `packages/backend`, `packages/frontend`). A broken lockfile in any of those packages breaks `npm run test` on non-Linux runners.

See [npm/cli#4828](https://github.com/npm/cli/issues/4828).

## Fix

Restored `packages/{core,cli,backend,frontend}/package-lock.json` from the v1.0.0 squash commit, which includes all platform `@rollup/rollup-*` optional dependency entries.

Added `npm run check:lockfiles` (runs in CI before `install:all`) so a Linux-only regen is caught on the first Linux matrix job instead of only on macOS/Windows.

## Guidance

When refreshing lockfiles:

1. Do not regenerate per-package lockfiles on a single OS only.
2. After any lockfile change, run `npm run check:lockfiles`.
3. If you must regen on one machine, verify all `node_modules/@rollup/rollup-*` entries remain (not only `linux-x64-gnu` / `linux-x64-musl`).

## Longer term

Per-package lockfiles in a non-workspace monorepo are fragile for optional native deps. Consolidating to npm workspaces with one root lockfile (see open-source polish backlog) reduces drift and makes cross-platform optional deps easier to keep correct.
