# TODO-1209: Generalise session metadata and filter fields

## Goal

Replace source-specific `claudeMeta` and named Claude-only filter fields with generic `metadata` / `metadataFilter`, and add `SessionProvider.metadataKeys()` for ticket 04.

## Plan

1. **Core types** — `MetadataKeyDescriptor`, `ComposerSession.metadata`, `SessionFilter.metadataFilter`; remove `ClaudeSessionMeta`, `gitBranch`, `permissionMode` from filter.
2. **Claude scan** — Populate `metadata` with string values (`cliVersion` from JSONL `version`, `hasSidechains` as `"true"`/`"false"`).
3. **`filterSessions`** — AND-match each `metadataFilter` entry against `session.metadata?.[key]`; no source branches.
4. **`metadata-filter.ts`** — Parse `metadata.<key>` from flat query objects; unit tests.
5. **Providers** — `metadataKeys()` on Cursor (empty) and Claude (gitBranch, cliVersion, permissionMode, hasSidechains).
6. **Backend** — `/api/sessions` and `/api/transcript-search` accept `metadata.*`; serialize `metadata` not `claudeMeta`.
7. **CLI** — `--metadata key=value` (repeatable) replaces `--git-branch` / `--permission-mode`.
8. **Frontend** — `ApiSession.metadata`, query via `metadata.*`, badges read string metadata.

## Test strategy

- Update `scan.test.ts` for `metadataFilter`; add stub-provider generality test.
- Update `claude-transcripts.test.ts` for AC2 metadata shape.
- Add `metadata-filter.test.ts` for query parsing.
- Extend `provider.test.ts` for `metadataKeys()`.
- Backend: add `metadata-query.test.ts` for parser integration if needed.

## Shipped (implementation)

- **Core** — `MetadataKeyDescriptor`, `ComposerSession.metadata`, `SessionFilter.metadataFilter`; removed `ClaudeSessionMeta` and named filter fields. `filterSessions` AND-matches metadata with no source branches. `metadata-filter.ts` parses `metadata.*` query keys and CLI pairs.
- **Claude** — JSONL scan populates `metadata` (`cliVersion` from `version`, booleans as `"true"`/`"false"`). `ClaudeSessionProvider.metadataKeys()` returns gitBranch, cliVersion, permissionMode, hasSidechains; Cursor returns `[]`.
- **Backend** — `/api/sessions` and `/api/transcript-search` accept `metadata.*`; responses serialize `metadata` (null when empty), not `claudeMeta`.
- **CLI** — `--metadata key=value` (repeatable) replaces `--git-branch` / `--permission-mode`.
- **Frontend** — `ApiSession.metadata`; filters send `metadata.gitBranch` / `metadata.permissionMode`; badges read string metadata.

## Deviations

- Frontend still shows Claude-only filter inputs (not dynamic chips — TODO-04). Wiring uses `metadata.*` query params as required.

## Risks / out of scope

- Dynamic filter chips (TODO-04).
- Rename `ComposerSession` → `Session` (TODO-03).
