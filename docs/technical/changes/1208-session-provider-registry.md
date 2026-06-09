# TODO-1208: SessionProvider interface and registry

## Goal

Introduce `SessionProvider`, `ProviderRegistry`, and `defaultProviderRegistry` so generic core code delegates to providers instead of branching on `source`. No user-visible behaviour change.

## Plan

1. **`provider.ts`** — `TranscriptFileRef`, `SessionProvider`, `ProviderRegistry`, `createDefaultProviders`, `defaultProviderRegistry(options?)`, `getProviderOrDefault`.
2. **`cursor-provider.ts`** — wraps `scanSessions` + `mergeComposerAndTranscriptSessions` + `scanAgentTranscriptSessions`; transcript find/list via agent-transcripts; resume tail `agent --resume=`.
3. **`claude-provider.ts`** — wraps `scanClaudeSessions`, claude transcript find/list, resume tail `claude --resume`.
4. **Dispatchers** — `loadComposerSessionsMerged`, `formatResumeCommand`, `resolveTranscriptFile` / `loadSessionConversation`, `listAllTranscriptJsonlFiles`, `searchAgentTranscriptLines` iterate the registry.
5. **`filterSessions`** — `source` filter validates against registry ids only; leave `gitBranch` / `permissionMode` Claude branches untouched (TODO-02).
6. **Tests** — `provider.test.ts` (registry + ids); stub third provider on a fresh `ProviderRegistry` (AC8) without editing dispatcher bodies.
7. **Exports** — re-export new symbols from `index.ts`; keep all existing public functions as thin wrappers.

## Deviations

- Split **`provider-defaults.ts`** from `provider.ts` to avoid circular imports between providers and `transcript-conversation.ts`.
- Provider `loadConversation` uses a **dynamic import** of `loadSessionConversation` so `cursor-provider` / `claude-provider` do not statically depend on conversation resolution at module load time.
- AC8 stub test uses a fresh **`ProviderRegistry`** with an `"amp" as SessionSource` stub (union unchanged per ticket); end-to-end scan/filter/resume-tail is asserted on the registry, mirroring `loadComposerSessionsMerged` without mutating `defaultProviderRegistry`.

## Test notes

- Existing `resume-command.test.ts`, `claude-transcripts.test.ts` (`loadComposerSessionsMerged`), and `transcript-conversation.test.ts` must pass unchanged.
- Registry singleton: per-call `defaultProviderRegistry({ cursorUserDir })` returns a fresh registry when options are passed (for `loadComposerSessionsMerged(userDir)`).
