# TODO-1210 — Rename Cursor-specific vocabulary in shared code

## Goal

Source-neutral public API and internal names (refactor only; no behaviour change).

## What shipped

| Old | New |
|-----|-----|
| `ComposerSession` | `Session` |
| `agent-transcripts.ts` | merged into `cursor-provider.ts` |
| `claude-transcripts.ts` | merged into `claude-provider.ts` |
| `AgentTranscriptJsonl` / `ClaudeTranscriptJsonl` | `TranscriptFileRef` (omit `source` for on-disk meta) |
| `searchAgentTranscriptLines` | `searchTranscriptLines` |
| `SearchAgentTranscriptLinesOptions` | `SearchTranscriptLinesOptions` |
| `loadComposerSessionsMerged` | `loadAllSessions` |
| `listAgentTranscriptJsonlFiles` | removed from public API; use `SessionProvider.listTranscriptFiles()` |
| `mergeComposerAndTranscriptSessions` | `mergeCursorDbAndTranscriptSessions` |
| `scanAgentTranscriptSessions` | `scanCursorTranscriptSessions` |

**Kept intentionally:** `parseComposerSessions` (reads Cursor `composer.composerData` JSON).

## Files

- `packages/core/src/cursor-provider.ts` — Cursor transcript discovery + `CursorSessionProvider`
- `packages/core/src/claude-provider.ts` — Claude transcript discovery + `ClaudeSessionProvider`
- Tests: `cursor-provider.test.ts`, `claude-provider.test.ts` (replaced `agent-transcripts.test.ts`, `claude-transcripts.test.ts`)
- Deleted: `agent-transcripts.ts`, `claude-transcripts.ts` and their `.test.ts` files

## Public exports (`packages/core/src/index.ts`)

Exports include `Session`, `loadAllSessions`, `searchTranscriptLines`, `TranscriptFileRef`.

Does **not** export: `ComposerSession`, old transcript JSONL types, `listAgentTranscriptJsonlFiles`, `resolveCursorUserDir`.

## Backend / CLI

- CLI uses `loadAllSessions()` without importing `resolveCursorUserDir`.
- Backend `/api/health` reports `cursorUserDir: process.env.CURSOR_USER_DIR ?? null` (no `@csb/core` export of `resolveCursorUserDir`).
- Startup log: `Session browser API http://localhost:${port}`.

## Docs

Updated `docs/technical/session-sources.md` for new symbol names. Product name “Cursor Session Browser” unchanged.

## Verification

```bash
npm run build && npm run test
```

Grep AC (old identifiers in `packages/`): zero hits except `parseComposerSessions` (Cursor DB parser, out of scope).
