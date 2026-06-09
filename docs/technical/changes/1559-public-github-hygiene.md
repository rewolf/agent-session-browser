# TODO-1559: Prepare agent-session-browser for public GitHub

## Scope

Ship pre-publish checklist items 1–6: MIT license, secure npm TLS defaults, README trust/privacy signals, root `package.json` metadata, CI matrix, and `SECURITY.md`. No application logic, workspaces refactor, or publishing.

## What shipped

| AC | Status | Notes |
|----|--------|-------|
| AC1 | Done | `LICENSE` (MIT, copyright rewolf); `"license": "MIT"` on root + `@asb/core`, `@asb/cli`, `@asb/backend`, `@asb/frontend` |
| AC2 | Done | `.npmrc` `strict-ssl=true`; `install:all` no longer passes `--strict-ssl=false`; root README and `README.cli.md` document `cafile` and local-only override |
| AC3 | Done | Removed standalone-repo line; added **Why this exists** and **Privacy** paragraphs |
| AC4 | Done | Root metadata with placeholder `https://github.com/rewolf/agent-session-browser` URLs |
| AC5 | Done | `.github/workflows/ci.yml` — push/PR to `master` (and `main` for future rename), Node 20 & 22 × ubuntu/macOS/windows, full install/build/test |
| AC6 | Done | `SECURITY.md` — GitHub Security Advisories + email placeholder, response SLAs, local-only scope |
| AC7 | Done | Local verification passed (223 tests across packages) |

## Deviations

Initial CI workflow targeted `main` only; repo default branch is `master` — fixed in review send-back. `README.cli.md` install section updated to match secure TLS defaults.

CI matrix uses prebuilt `better-sqlite3` binaries; no extra Windows build-tool step was required locally (GitHub Actions validation pending first push).

## Out of scope (unchanged)

Workspaces, ESLint/Prettier, CHANGELOG, CoC, Dependabot, git history rewrite, actual GitHub publish.

## Commits

- `ffac605` — implementation plan
- `23304dd` — license, metadata, CI, SECURITY, TLS, README
- `b8988b1` — reconcile plan with initial implementation
- (send-back) `99ae046` — CI branch trigger (`master`/`main`), `README.cli.md` TLS alignment

## Verification

```sh
npm install && npm run install:all && npm run build && npm run test
```

All 223 tests passed on Linux (Node in environment) after changes.
