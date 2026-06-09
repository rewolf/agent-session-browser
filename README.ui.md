# Web UI

React + Vite frontend and a small Express API that reuse `@asb/core` to read local session data from the registry's configured providers (Cursor, Claude, and additional provider ids when registered).

## Ports (defaults)

| Service | Port | Env override |
|---------|------|----------------|
| API | `3847` | `PORT` |
| Vite dev | `3846` | `VITE_PORT` |

Vite proxies `/api/*` to `VITE_API_TARGET` (default `http://localhost:3847`).

## Install / build

From repo root:

```bash
npm install
npm run install:all
npm run build
```

Production-ish run (after build):

```bash
node packages/backend/dist/index.js
# serve packages/frontend/dist with any static host, or:
npx --yes serve -s packages/frontend/dist -l 3846
```

## Development

```bash
npm run dev
```

Starts the API (with `tsx watch` on `packages/backend`) and the Vite dev server. Open the URL Vite prints (e.g. `http://localhost:3846`).

Set `CURSOR_USER_DIR` in the shell before `npm run dev` if Cursor’s data is not under the [default path for your OS](README.md#configuration).

## Features

- **Source filter** (header): segmented control driven by `GET /api/providers` (**All Agents** plus one segment per registered provider). Each provider chip uses the descriptor’s `badgeColor` (CSS accent) and `healthStatus` (unhealthy providers get a distinct style). Session counts per provider come from the latest `GET /api/sessions` load: when a provider is **unavailable**, its count shows **—** (not `0`); hover the chip for `message` / `remediation` from the unavailable entry. Persists as `?source=<id>` in the URL (`all` omits the param). Filters tree, workspaces, sessions, conversation fetch, and transcript search.
- **Unavailable banner**: when `GET /api/sessions` returns one or more `unavailable` entries, an inline alert lists each provider’s `message` and optional `remediation` (scoped by `?source=` the same way as sessions).
- **Sidebar**: hierarchical navigation (collapsed single-child chains). Grouping follows each provider’s `workspaceGrouping` from the descriptor (`fs-path` by default for built-ins; `external-id` / `none` for other providers). Contextual subtitle explains whether the selection filters the session list or narrows transcript search scope.
- **Sessions**: sortable table — leading **bookmark** star column, then Source, ID, Name, Workspace (leaf; hover for all roots), Created, Updated. **ID**, **Created**, and **Updated** use single-line layout (`white-space: nowrap`) so full UUIDs and `YYYY-MM-DD HH:MM` timestamps do not wrap. When the API provides an **excerpt** (first user message from the session transcript, ≤80 chars), a muted sub-row beneath the main row spans ID through Actions: one-line ellipsis preview; omitted when `excerpt` is null. Click the star to bookmark a session (outline when off, filled when on); bookmarks persist in `localStorage` as `asb.sessionAnnotations` (keyed `${source}:${sessionId}`). Bookmarked rows sort before non-bookmarked rows while **Starred only** is off; the active column sort (default **Updated** descending) applies within each group. In the **Name** column, an optional alias shows as `{alias} ({provider name})` when both exist, alias alone when the provider name is empty, or `(no name)` when neither is set. A pencil icon (visible on row hover/focus) opens inline alias edit — Enter or blur saves, Escape cancels; empty input clears the alias. **Metadata** is hidden by default; use the column-visibility control (columns icon, top-right of the table header) to show it. The choice persists in `localStorage` as `asb.columns.metadata` (`show` | `hide`). **Actions** column renders every entry in the row’s `primaryActions` array (descriptor-driven): shell actions copy a command (same UX as legacy Resume; display may show `\\\n` after `&&`); URL actions open in a new tab. Built-in providers still expose a single `resume` command action; `resumeCommand` remains on each row for transcript search hits and backward compatibility. **Metadata filter** fields above the table (per-provider descriptor keys) work whether or not the Metadata column is visible.
- **Sessions filters**: two-row filter panel — date range (From/To) with **Created** / **Updated** chosen via a clickable word in the header (persists in `localStorage` as `asb.filters.dateMode`); workspace combobox, name/id text search with inline clear buttons (matches provider name, session id, and stored aliases client-side after **Refresh**); optional **Starred only** checkbox (persists as `asb.filters.starredOnly`, filters the current table instantly); tall outlined **Refresh** applies pending filter changes (disabled until inputs differ from the last successful fetch).
- **Message search** (tab): case-insensitive substring search over agent JSONL transcript lines; optional session scoping via sidebar path prefix, exact workspace, and/or created/updated datetime range; optional `role` filter on each line’s JSON `role` field; capped hit list (see API). Hits include `source` and `resumeCommand` when the source filter is `all`. Two-row filter bar aligned with **Sessions filters**: date row (**Scan sessions by** + clickable **Created** / **Updated** toggle, From → To) and text row (Message, Workspace, Role), with tall outlined **Search transcripts** anchored on the right. **Created** / **Updated** date scope persists independently in `localStorage` as `asb.msgSearch.dateMode` (default **`updated`**; not shared with `asb.filters.dateMode`); changing the toggle does not auto-run search—the new mode applies on the next **Search transcripts** submit. Message, Workspace, and Role fields use inline clear (`✕`) controls (shared `FilterInputWithClear` pattern). **Search transcripts** is disabled until Message text is non-empty (trimmed) and while a search request is in flight (loading / pulsing affordance). See `docs/technical/changes/1339-message-search-filter-bar-parity.md` for implementer detail.

## API

- `GET /api/health` — `{ ok, cursorUserDir }`
- `GET /api/providers` — registered session providers (drives source filter, badges, and health styling): `[{ id, displayName, badgeColor?, metadataKeys, resumeCommandName?, workspaceGrouping, healthStatus }, …]`. `workspaceGrouping` is `"fs-path"` | `"external-id"` | `"none"`. `healthStatus` is `{ ok: true }` or `{ ok: false, reason, message, remediation? }` with `reason` in `auth` | `network` | `not-installed` | `other`.
- `GET /api/tree?source=` — navigation tree JSON (`NavTreeNode` or `null`). Optional `source`: provider id from the registry, or `all` (default). Invalid values → `400` with accepted ids listed.
- `GET /api/workspaces?source=` — `{ paths: string[] }` (same `source` semantics).
- `GET /api/sessions?workspace=&q=&dateField=created|updated&rangeFrom=&rangeTo=&source=` — `{ sessions, unavailable }`. `sessions` is an array of row objects; each includes `sessionId`, `name`, workspace fields, timestamps, `source`, `resumeCommand`, `primaryActions` (`[{ id, label, command?, url? }, …]` from the provider descriptor), `metadata` (provider-specific key/value map or `null`), and `excerpt` (`string | null` — single-line preview of the first user message from the session JSONL, ≤80 chars; `null` when no derivable message). Top-level `unavailable` lists providers that could not scan: `[{ providerId, reason, message, remediation? }, …]`. Optional `source` filters both `sessions` and `unavailable` before other query params apply to the session list.
- `GET /api/sessions/:sessionId/conversation?source=` — full parsed JSONL transcript for one session (`messages` with role, optional timestamp, and content blocks). The API resolves the source from `?source=<id>` when provided, otherwise from the indexed session list; it returns `400` when the source still cannot be determined and `404` when no JSONL exists.
- `GET /api/transcript-search?q=&pathPrefix=&workspace=&dateField=created|updated&rangeFrom=&rangeTo=&limit=&role=&source=` — searches JSONL lines. Optional `role` restricts to lines that parse as a JSON object whose string `role` matches (trimmed, case-insensitive). Omit `pathPrefix`, `workspace`, and both date bounds to scan all transcript files (can be slow). `limit` defaults to 200, max 5000. Hits are ordered newest first by per-line JSON timestamp when present (`timestamp`, `messageTime`, `createdAt`, `time`, including under `message`), otherwise by the containing session’s **updated** time. Response: `{ hits, limit, capped }`; each hit includes `sessionId`, `source`, `resumeCommand`, `role` (top-level JSON `role`, or `null`), `sortAt` / `sortAtIso` (display/sort time), and `timeSource` (`message` or `session`).

All endpoints are read-only.

## Theme

Dark layout with cyan/blue accents (see `packages/frontend/src/index.css`).
