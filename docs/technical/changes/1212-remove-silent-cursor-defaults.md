# TODO-1212 — Remove silent `cursor` defaults and tighten source resolution

## Plan

Remove implicit `"cursor"` fallbacks in conversation loading and API response mapping so ambiguous requests fail fast with clear errors. Require an explicit `SessionSource` (or resolved transcript file meta) for `loadSessionConversation`; validate session rows always carry `source` before serializing API payloads.

## Acceptance criteria mapping

| AC | Approach |
|----|----------|
| AC1 | `loadSessionConversation` second argument required (no default); TypeScript enforces at compile time |
| AC2 | Unit test: unknown source throws `Unknown session source` |
| AC3 | Backend test: unknown session id without `?source=` → HTTP 400 |
| AC4 | Backend test: `?source=claude` calls `loadSessionConversation` with explicit source |
| AC5 | `requireSessionSource` / `serializeSession` unit tests for untagged rows |
| AC6 | Grep `packages/backend/src` and `packages/core/src` (excluding provider internals) for `?? "cursor"` / `\|\| "cursor"` dispatch fallbacks — zero hits |
| AC7 | Full `npm test`; update tests that relied on silent defaults |
| AC8 | CLI unchanged (already passes explicit source); existing CLI tests |

## Implementation notes

- Extract `session-response.ts` with `requireSessionSource` and `serializeSession` for testable session-list mapping.
- `resolveTranscriptFile` uses `registry.get(source)` and throws on unknown ids instead of `getProviderOrDefault`.
- Transcript search hit mapping throws when the indexed session row lacks `source` (same invariant as session list).

## Shipped

- **`transcript-conversation.ts`**: Removed default `"cursor"` on `loadSessionConversation`; `resolveTranscriptFile` throws `Unknown session source` when the registry has no provider (no `getProviderOrDefault` fallback).
- **`server.ts`**: Conversation route returns HTTP 400 with a structured `error` when `?source=` and indexed row cannot supply a source; transcript-search hit mapping throws if the session row lacks `source` (no `?? "cursor"`).
- **`session-response.ts`**: New module with `requireSessionSource` and `serializeSession` so untagged session rows fail loudly (AC5).
- **Tests**: Core unknown-source test; backend `session-response` and `conversation-route` tests (mocked `loadBrowserData` / `loadSessionConversation`).
- **Docs**: `session-sources.md` updated to document required source.

No deviations from the initial plan.
