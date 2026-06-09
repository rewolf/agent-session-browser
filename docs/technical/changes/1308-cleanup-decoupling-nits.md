# TODO-1308 — Cleanup nits after decoupling

## Scope

Five independent polish items after tickets 01–07: dead UI conditional, registry-driven CLI help, Cursor scan encapsulation, required `registry` on session filters, and `clean` before `tsc`.

## Plan

| Sub-task | Change |
|----------|--------|
| A | Collapse dead ternary in `MetadataBadges.tsx` |
| B | Generate CLI `--source` placeholder/description from `registry.ids()` via `source-help.ts`; CLI tests for default and amp-extended registry |
| C | Move SQLite workspace scan to `cursor-workspace-storage.ts`; rename `scan.ts` → `session-filters.ts`; drop `scanSessions` / `listWorkspaceStorageDirs` from public exports |
| D | `filterSessions` / `filterSessionsForApi` require `registry: ProviderRegistry`; update backend, CLI, tests; regression test for unknown source → `[]` |
| E | `clean` script (`rimraf dist`) before `tsc` in core, backend, cli; root `clean` via workspaces |

## Shipped

All five sub-tasks implemented on `feature/todo-1308`:

- **A** — Single `title` expression in `MetadataBadges.tsx`.
- **B** — `packages/cli/src/source-help.ts` + tests; `index.ts` builds `--source` option from `defaultProviderRegistry().ids()` at startup (Option 2, same UX for cursor/claude).
- **C** — `scanCursorComposerDbSessions` in `cursor-workspace-storage.ts` with `sourceId` from provider; generic helpers in `session-filters.ts`; public exports no longer include `scanSessions` or `listWorkspaceStorageDirs`.
- **D** — Required `registry` on `filterSessions` / `filterSessionsForApi`; `scopeBrowserData` takes registry; regression test for unknown source returns `[]`.
- **E** — `npm run clean && tsc` in core, backend, cli; root `npm run clean` chains the three.

## Deviations

None.

## Verification

- `npm run install:all && npm run build && npm run test` — pass (119 tests).
- AC greps: no dead MetadataBadges ternary; no hardcoded `cursor|claude|all` in CLI src (only tests); no `scanSessions` / optional `registry?` in core src; `source: "cursor"` in production scan path uses provider id via `cursor-workspace-storage.ts`.

## Commits

- `2775827` — plan doc
- `1605ffb` — MetadataBadges
- `f46adde` — scan encapsulation + required registry
- `4c54c0d` — CLI source-help
- `c0a431a` — clean before tsc
