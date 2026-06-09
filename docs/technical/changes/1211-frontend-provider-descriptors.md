# TODO-1211 — Frontend reads provider descriptors from the backend

## Goal

Remove compile-time knowledge of session sources from the frontend. The backend exposes `GET /api/providers`; the UI loads descriptors once at startup and drives badges, source filter, metadata chips, and `cycleSourceFilter` from that data.

## Plan

1. **Core** — Optional `badgeColor` and `resumeCommandName` on `SessionProvider`; `ProviderDescriptor` type and `providerToDescriptor()` helper; Claude `displayName` → "Claude Code".
2. **Backend** — `GET /api/providers` maps `defaultProviderRegistry().all()` to descriptors; Vitest covers shape and default providers.
3. **Frontend** — `ProvidersContext` (single fetch on mount); `fetchProviders` in `api.ts`; data-driven `SourceBadge`, `SourceFilterControl`, `cycleSourceFilter(current, ids)`; `MetadataFilterChips` for active source; URL `metadata.*` query params; remove per-source CSS badge classes.
4. **CLI** — `cycleSourceFilter(current, registry.ids())` in interactive mode.
5. **Tests** — Backend `/api/providers`; frontend `SourceFilterControl` with mocked three providers (AC9).

## Acceptance mapping

| AC | Approach |
|----|----------|
| AC1 | Backend route + test |
| AC2 | `ProvidersProvider` + `useEffect([])` fetch |
| AC3–AC4 | `useProvider` + dynamic filter control |
| AC5 | Parameterised `cycleSourceFilter`; CLI uses registry ids |
| AC6 | `MetadataFilterChips` + URL metadata params |
| AC7 | No hardcoded source ids in UI modules (ids only in types for API rows) |
| AC8 | Inline `badgeColor` on badge; drop `--cursor`/`--claude` CSS |
| AC9 | Vitest tests listed above |

## Deviations

- Claude provider `displayName` set to **Claude Code** (was **Claude**) so UI matches product naming without frontend literals.
- Badge styling uses inline `color` / `borderColor` / `backgroundColor` from `badgeColor` with a short alpha suffix (`33`) for fill.
- Session list waits on `providersLoading` before the first fetch (AC2: descriptors load before session table data).

## Shipped

- `packages/core/src/provider-descriptor.ts` — `ProviderDescriptor`, `providerToDescriptor()`.
- `GET /api/providers` in `packages/backend/src/server.ts`; test in `providers.test.ts`.
- `ProvidersProvider`, `useProvider`, `MetadataFilterChips`, parameterised `cycleSourceFilter`.
- Removed `.source-badge--cursor` / `.source-badge--claude` from `index.css`.
- CLI interactive mode passes `defaultProviderRegistry().ids()` into `cycleSourceFilter`.
