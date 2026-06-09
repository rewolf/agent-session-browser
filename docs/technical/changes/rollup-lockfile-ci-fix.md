# Rollup optional-deps lockfile CI fix

## Problem

Regenerating `packages/frontend/package-lock.json` on Linux only (during min-release-age lockfile refresh) dropped lockfile entries for `@rollup/rollup-darwin-*` and `@rollup/rollup-win32-*` optional packages. CI build failed on macOS and Windows with:

```
Cannot find module @rollup/rollup-darwin-arm64
Cannot find module @rollup/rollup-win32-x64-msvc
```

See [npm/cli#4828](https://github.com/npm/cli/issues/4828).

## Fix

Restored `packages/frontend/package-lock.json` from the v1.0.0 squash commit, which includes all platform `@rollup/rollup-*` optional dependency entries.

## Guidance

When refreshing lockfiles, do not regenerate `packages/frontend/package-lock.json` on a single OS only. If you must, verify all `node_modules/@rollup/rollup-*` entries remain in the lockfile (not only `linux-x64-gnu` / `linux-x64-musl`).
