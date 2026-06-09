import React from "react";
import {
  readFilterDateMode,
  writeFilterDateMode,
  type FilterDateMode,
} from "./filterDateMode";
import { MessageSearchPanel } from "./MessageSearchPanel";
import { NavPanel } from "./NavPanel";
import { SessionFilterBar } from "./SessionFilterBar";
import { SessionTable } from "./SessionTable";
import { SourceFilterControl } from "./SourceFilterControl";
import { UnavailableBanner } from "./UnavailableBanner";
import { fetchSessions, fetchWorkspaces } from "./api";
import {
  normalizeSessionFilterSnapshot,
  sessionFiltersDirty,
  type SessionFilterSnapshot,
} from "./sessionFilterSnapshot";
import {
  clearMetadataKeysFromUrl,
  parseMetadataFromSearch,
} from "./metadataFilter";
import { useProviders } from "./providersContext";
import {
  parseSourceFromSearch,
  writeSourceFilterToUrl,
  type SourceFilter,
} from "./sourceFilter";
import type { ApiSession } from "./types";
import { APP_NAME } from "./branding";
import {
  filterSessionsByTextQ,
  filterSessionsStarredOnly,
} from "./sessionClientFilter";
import {
  readStarredOnlyFilter,
  writeStarredOnlyFilter,
} from "./starredOnlyFilter";
import { useSessionAnnotations } from "./useSessionAnnotations";

export function App() {
  const { byId, providerIds, loading: providersLoading } = useProviders();
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>(() =>
    parseSourceFromSearch(window.location.search)
  );
  const [metadataFilter, setMetadataFilter] = React.useState(() =>
    parseMetadataFromSearch(window.location.search)
  );
  const [tab, setTab] = React.useState<"sessions" | "messages">("sessions");
  const [pathPrefix, setPathPrefix] = React.useState("");
  const [workspaces, setWorkspaces] = React.useState<string[]>([]);
  const [workspaceFilter, setWorkspaceFilter] = React.useState("");
  const [textQ, setTextQ] = React.useState("");
  const [dateField, setDateField] = React.useState<FilterDateMode>(() =>
    readFilterDateMode()
  );
  const [appliedFilters, setAppliedFilters] =
    React.useState<SessionFilterSnapshot | null>(null);
  const [rangeFrom, setRangeFrom] = React.useState("");
  const [rangeTo, setRangeTo] = React.useState("");
  const [starredOnly, setStarredOnly] = React.useState(() =>
    readStarredOnlyFilter()
  );
  const [annotations, annotationActions] = useSessionAnnotations();

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sessions, setSessions] = React.useState<ApiSession[]>([]);
  const [unavailable, setUnavailable] = React.useState<
    import("./types").ProviderUnavailable[]
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const snap = React.useMemo(
    () => ({
      pathPrefix,
      workspaceFilter,
      textQ,
      metadataFilter,
      dateField,
      rangeFrom,
      rangeTo,
      workspaces,
      sourceFilter,
    }),
    [
      pathPrefix,
      workspaceFilter,
      textQ,
      metadataFilter,
      dateField,
      rangeFrom,
      rangeTo,
      workspaces,
      sourceFilter,
    ]
  );

  React.useEffect(() => {
    if (providerIds.length === 0) {
      return;
    }
    setSourceFilter(
      parseSourceFromSearch(window.location.search, providerIds)
    );
  }, [providerIds]);
  const snapRef = React.useRef(snap);
  snapRef.current = snap;

  const onSourceFilterChange = React.useCallback(
    (next: SourceFilter) => {
      setSourceFilter(next);
      writeSourceFilterToUrl(next);
      setMetadataFilter((prev) => {
        if (next === "all") {
          const keys = Object.keys(prev);
          if (keys.length > 0) {
            clearMetadataKeysFromUrl(keys);
          }
          return {};
        }
        const allowed = new Set(
          byId.get(next)?.metadataKeys.map((d) => d.key) ?? []
        );
        const trimmed: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (allowed.has(k)) {
            trimmed[k] = v;
          }
        }
        const dropped = Object.keys(prev).filter((k) => !allowed.has(k));
        if (dropped.length > 0) {
          clearMetadataKeysFromUrl(dropped);
        }
        return trimmed;
      });
    },
    [byId]
  );

  const activeMetadataKeys =
    sourceFilter === "all"
      ? []
      : (byId.get(sourceFilter)?.metadataKeys ?? []);

  const sessionCountBySource = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) {
      m.set(s.source, (m.get(s.source) ?? 0) + 1);
    }
    return m;
  }, [sessions]);

  const unavailableBySource = React.useMemo(() => {
    const m = new Map<string, { message: string; remediation?: string }>();
    for (const u of unavailable) {
      m.set(u.providerId, {
        message: u.message,
        remediation: u.remediation,
      });
    }
    return m;
  }, [unavailable]);

  const scopedUnavailable = React.useMemo(() => {
    if (sourceFilter === "all") {
      return unavailable;
    }
    return unavailable.filter((u) => u.providerId === sourceFilter);
  }, [unavailable, sourceFilter]);

  React.useEffect(() => {
    fetchWorkspaces(sourceFilter)
      .then(setWorkspaces)
      .catch((e: Error) => console.error(e));
  }, [sourceFilter]);

  const load = React.useCallback(async () => {
    const {
      pathPrefix: prefix,
      workspaceFilter: wf0,
      textQ: q,
      metadataFilter: meta,
      dateField: df,
      rangeFrom: rf0,
      rangeTo: rt0,
      workspaces: ws,
      sourceFilter: sf,
    } = snapRef.current;

    setLoading(true);
    setError(null);
    try {
      let wf = wf0.trim();
      const p = prefix.trim();
      if (!wf && p) {
        const under = ws.filter(
          (w) =>
            w === p || w.startsWith(p + "/") || w.startsWith(p + "\\")
        );
        if (under.length === 1) wf = under[0]!;
      }

      const rf = rf0.trim();
      const rt = rt0.trim();
      const rfMs = rf ? Date.parse(rf) : NaN;
      const rtMs = rt ? Date.parse(rt) : NaN;
      if ((rf && Number.isNaN(rfMs)) || (rt && Number.isNaN(rtMs))) {
        setError('Invalid "from" or "to" datetime.');
        setLoading(false);
        return;
      }

      const { sessions: rows, unavailable: unavail } = await fetchSessions({
        workspace: wf || undefined,
        metadataFilter:
          Object.keys(meta).length > 0 ? meta : undefined,
        dateField: df,
        rangeFrom: rf && !Number.isNaN(rfMs) ? new Date(rfMs).toISOString() : undefined,
        rangeTo: rt && !Number.isNaN(rtMs) ? new Date(rtMs).toISOString() : undefined,
        source: sf,
      });
      setUnavailable(unavail);
      setSessions(filterByPrefix(rows, p, wf));
      setAppliedFilters(
        normalizeSessionFilterSnapshot({
          workspaceFilter: wf0,
          textQ: q,
          dateField: df,
          rangeFrom: rf0,
          rangeTo: rt0,
        })
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const currentFilters = React.useMemo(
    () =>
      normalizeSessionFilterSnapshot({
        workspaceFilter,
        textQ,
        dateField,
        rangeFrom,
        rangeTo,
      }),
    [workspaceFilter, textQ, dateField, rangeFrom, rangeTo]
  );

  const refreshDisabled = !sessionFiltersDirty(currentFilters, appliedFilters);

  const displaySessions = React.useMemo(() => {
    let rows = sessions;
    const q = appliedFilters?.textQ ?? "";
    if (q) {
      rows = filterSessionsByTextQ(rows, q, annotations);
    }
    return filterSessionsStarredOnly(rows, starredOnly, annotations);
  }, [sessions, appliedFilters, starredOnly, annotations]);

  const onStarredOnlyChange = React.useCallback((enabled: boolean) => {
    setStarredOnly(enabled);
    writeStarredOnlyFilter(enabled);
  }, []);

  const onDateFieldToggle = React.useCallback(() => {
    const next: FilterDateMode =
      dateField === "created" ? "updated" : "created";
    setDateField(next);
    writeFilterDateMode(next);
    snapRef.current = { ...snapRef.current, dateField: next };
    void load();
  }, [dateField, load]);

  React.useEffect(() => {
    if (providersLoading) {
      return;
    }
    void load();
  }, [pathPrefix, sourceFilter, metadataFilter, providersLoading, load]);

  return (
    <div className="app cyber-app">
      <header className="app-header cyber-glow-border">
        <SourceFilterControl
          value={sourceFilter}
          onChange={onSourceFilterChange}
          sessionCountBySource={sessionCountBySource}
          unavailableBySource={unavailableBySource}
        />
        <h1>{APP_NAME}</h1>
      </header>
      <nav className="app-tabs" aria-label="Main views">
        <button
          type="button"
          className={tab === "sessions" ? "tab active" : "tab"}
          onClick={() => setTab("sessions")}
        >
          Sessions
        </button>
        <button
          type="button"
          className={tab === "messages" ? "tab active" : "tab"}
          onClick={() => setTab("messages")}
        >
          Message search
        </button>
      </nav>
      <div
        className={
          sidebarCollapsed ? "layout layout--sidebar-collapsed" : "layout"
        }
      >
        {sidebarCollapsed ? (
          <button
            type="button"
            className="sidebar-expand-fab"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Expand repos sidebar"
            aria-expanded={false}
            title="Expand repos sidebar"
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <aside className="sidebar cyber-panel">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse repos sidebar"
              aria-expanded={true}
              title="Collapse repos sidebar"
            >
              <ChevronLeftIcon />
            </button>
            <h2>Repos</h2>
            <p className="sidebar-context">
              {tab === "sessions"
                ? "Filters the session list to workspaces under this path."
                : "Narrows transcript search to sessions under this path."}
            </p>
            <div className="sidebar-nav-card">
              <NavPanel
                pathPrefix={pathPrefix}
                sourceFilter={sourceFilter}
                onNavigate={setPathPrefix}
              />
            </div>
          </aside>
        )}
        <main className="main">
          {tab === "sessions" ? (
            <>
              <SessionFilterBar
                workspaces={workspaces}
                workspaceFilter={workspaceFilter}
                onWorkspaceFilterChange={setWorkspaceFilter}
                textQ={textQ}
                onTextQChange={setTextQ}
                dateField={dateField}
                onDateFieldToggle={onDateFieldToggle}
                rangeFrom={rangeFrom}
                onRangeFromChange={setRangeFrom}
                rangeTo={rangeTo}
                onRangeToChange={setRangeTo}
                metadataKeys={activeMetadataKeys}
                metadataFilter={metadataFilter}
                onMetadataFilterChange={setMetadataFilter}
                starredOnly={starredOnly}
                onStarredOnlyChange={onStarredOnlyChange}
                loading={loading}
                refreshDisabled={refreshDisabled}
                onRefresh={() => void load()}
              />
              <UnavailableBanner items={scopedUnavailable} />
              <SessionTable
                data={displaySessions}
                loading={loading || providersLoading}
                error={error}
                annotations={annotations}
                onToggleBookmark={annotationActions.toggleBookmark}
                onAliasChange={annotationActions.setAlias}
                bookmarkSortEnabled={!starredOnly}
              />
            </>
          ) : (
            <MessageSearchPanel
              pathPrefix={pathPrefix}
              workspaces={workspaces}
              sourceFilter={sourceFilter}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M14 6 15.41 7.41 10.83 12l4.58 4.59L14 18l-6-6 6-6z"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"
      />
    </svg>
  );
}

function filterByPrefix(
  rows: ApiSession[],
  prefix: string,
  workspaceExact: string
): ApiSession[] {
  if (!prefix.trim()) return rows;
  if (workspaceExact) return rows;
  const p = prefix.replace(/[/\\]+$/, "");
  return rows.filter((r) =>
    (r.workspaceRoots ?? [r.workspacePath]).some(
      (root) =>
        root === p ||
        root.startsWith(p + "/") ||
        root.startsWith(p + "\\")
    )
  );
}
