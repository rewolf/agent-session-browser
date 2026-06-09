# TODO-1279: Finish source decoupling cleanup

## Scope

Close the remaining source-specific leaks after TODO-1208/1210/1211/1262 by generalizing metadata UI rendering, removing provider dynamic conversation imports, stopping committed build artifacts, and making registry usage explicit through backend/CLI entry points.

## Acceptance criteria mapping

| Area | Plan |
|------|------|
| A | Replace `ClaudeMetaBadges` with descriptor-driven `MetadataBadges` and remove source-keyed metadata logic from frontend tables/styles |
| B | Refactor transcript conversation loading so providers pass refs directly; remove dynamic imports and `TranscriptFileMeta` indirection |
| C | Ignore and remove committed `packages/*/dist/` artifacts; verify build/test flow still works cleanly |
| D | Remove cached default registry singleton; inject a shared registry from backend/CLI entry points through all helper call paths |
| Docs/tests | Update architecture/change docs and extend/adjust tests to cover new registry and metadata behavior |

## Planned implementation slices

1. Build hygiene first (`dist/` ignore + cleanup) to reduce review noise.
2. Frontend metadata generalization (`MetadataBadges`, table rendering, CSS, tests).
3. Core conversation-loading refactor (static imports, ref-based helpers, compatibility path for source lookup).
4. Registry injection pass across core/backend/CLI helpers and tests.
5. Reconcile this document with shipped behavior and deviations before review handoff.

## Risks and mitigations

- Registry-parameter threading can touch many files; mitigate with targeted helper signature changes and compile/test loops after each slice.
- UI metadata rendering may regress empty-state behavior; mitigate with explicit component tests for missing metadata and non-Claude provider descriptors.
- Removing committed `dist/` can break workflows if build ordering is unclear; mitigate with README/docs updates and full build/test verification.

## Shipped

- **Frontend metadata decoupling**
  - Replaced `ClaudeMetaBadges` with `MetadataBadges` (`git mv`), updated `SessionTable` to render metadata without source id branching, and consolidated styling to `metadata-badge` classes.
  - Rendering now follows provider descriptors (`kind: boolean|enum|text`) via `useProvider(source)?.metadataKeys`; empty/missing values still render `—`.
  - Added/updated tests in `MetadataBadges.test.tsx` and `SessionTable.test.tsx` including an `amp` descriptor case.
- **Provider-owned conversation reads**
  - Removed provider dynamic imports from `cursor-provider.ts` and `claude-provider.ts`.
  - `loadSessionConversation` now reads from `TranscriptFileRef`; source-based lookup moved to `loadSessionConversationBySource(sessionId, source, registry)`.
  - Removed `TranscriptFileMeta` and source-stripping indirection.
- **Registry injection and singleton removal**
  - `defaultProviderRegistry` is now a pure factory (no module cache).
  - Backend and CLI entry points each construct one registry and pass it through server/command flows.
  - Updated helper signatures and call sites (`formatResumeCommand`, `loadAllSessions`, `loadBrowserData`, source parsing, transcript search, session serialization).
  - Added `provider-defaults.test.ts` regression coverage proving environment path changes are observed across registry constructions.
- **Build hygiene and docs**
  - Added `packages/*/dist/` ignore rule and documented build-after-pull expectation in `README.md`.
  - Updated `docs/technical/session-sources.md` to reflect registry injection and ref-based transcript loading.
  - Follow-up send-back: corrected the root `README.md` overview to describe the shipped multi-provider, registry-driven scope (instead of Cursor-only wording) and align it with CLI/UI/technical documentation.
  - Follow-up send-back #2: corrected `README.ui.md` so the UI/API overview is provider-agnostic and the conversation endpoint `source` behavior matches `packages/backend/src/server.ts` (derive from query when provided, otherwise from indexed session row, fail with `400` only when unresolved).

## Deviations

- No tracked `packages/*/dist/` artifacts existed in this branch when the work started, so there was nothing to remove from git history in this change; the hygiene update is enforced through `.gitignore` and docs.

## Verification

- `npm run build`
- `npm run test`
