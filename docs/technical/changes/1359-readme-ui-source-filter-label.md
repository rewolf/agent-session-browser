# TODO-1359: Update README.ui.md source filter label (All → All Agents)

## Plan

Documentation-only follow-up to TODO-1340. Align operator-facing UI docs with the shipped aggregate segment label **All Agents** in `sourceFilterLabel` (`packages/frontend/src/sourceFilter.ts`).

| Piece | Approach |
|-------|----------|
| Target | `README.ui.md` — **Features** → **Source filter** bullet (~line 44) |
| Change | Replace aggregate segment description `` `All` `` with **All Agents** |
| Scan | `README.md` and other operator-facing UI docs for stale aggregate-segment `All` labels |
| Preserve | Internal filter value `all`, URL semantics (`all` omits `?source=`), unrelated uses of "All" |
| Out of scope | Code, CSS, tests; historical `docs/technical/changes/*` records |

## Acceptance mapping

1. **Source filter** bullet documents **All Agents** as the aggregate segment label.
2. No stale aggregate-segment `All` in operator-facing UI docs.
3. Internal `all` filter/URL references unchanged.
4. Historical change notes left as point-in-time records.
5. Verification: `sourceFilterLabel` still returns `"All Agents"` for filter `"all"`.

## Shipped

| Piece | Implementation |
|-------|----------------|
| README.ui.md | **Source filter** bullet: aggregate segment documented as **All Agents** |
| Scan | `README.md` — no stale aggregate-segment labels; historical change notes left unchanged |
| Verification | No `` `All` `` in README.ui.md for source filter; `sourceFilterLabel("all")` → `"All Agents"` |

**Deviations:** None.
