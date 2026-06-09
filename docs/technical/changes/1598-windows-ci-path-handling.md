# TODO-1598: Fix Windows CI path handling in core

## Goal

Make all `packages/core` unit tests pass on `windows-latest` GitHub Actions without dropping the OS matrix. Failures are host-OS `path.join` / `path.resolve` leaking into platform-parameterized logic and POSIX slug decoding.

## Approach

1. **`paths.ts` (AC1):** Use `path.posix.join` / `path.posix.resolve` for `darwin`, `linux`, and default branches in `defaultCursorUserDirForPlatform`. Keep `path.win32.join` for `win32`.
2. **`hashed-dir-path.ts` (AC2):** Build slug candidate paths with `path.posix.resolve` so mocks using `/home/...` keys match on every host.
3. **Nav tree tests (AC3):** Add `test-path.ts` with `asPosixPath` for assertions on synthetic POSIX fixtures; update `nav-tree.test.ts` and `nav-tree-grouped.test.ts`. No production `nav-tree.ts` changes (real Windows workspaces use Win32 paths).
4. **Provider slug tests (AC4):** Should pass after AC2 without mock changes.

## Out of scope

- Removing `windows-latest` from CI.
- Reworking `nav-tree.ts` production logic for mixed roots.
- Windows drive-letter slug decoding.

## Test plan

- `npm run test --prefix packages/core`
- `npm run test` from repo root (Linux regression)

---

## Shipped (implementation)

- `defaultCursorUserDirForPlatform` uses `path.posix.join` / `path.posix.resolve` for `darwin`, `linux`, and default (non-win32) branches; `win32` unchanged (`path.win32.join`).
- `hashedDirToWorkspacePath` builds candidates with `path.posix.resolve` so POSIX-encoded slugs decode consistently on Windows CI hosts.
- Added `packages/core/src/test-path.ts` (`asPosixPath`) for nav-tree test assertions on synthetic `/home/...` and `/flat/...` fixtures.
- Updated `nav-tree.test.ts`, `nav-tree-grouped.test.ts`, and `paths.test.ts` (`path.posix.isAbsolute` for relative XDG case).
- No changes to `nav-tree.ts` production logic, CI workflow, or provider test mocks.
- Verified: 90/90 core tests and full monorepo `npm run test` green on Linux.
