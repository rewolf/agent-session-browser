import React from "react";
import { CopyableCell } from "./CopyButton";
import { SessionActionsCell } from "./SessionActionsCell";
import { formatLocaleDateTime, formatLocaleDateTimeTitle } from "./format";
import { SessionIdCell } from "./SessionIdCell";
import { fetchTranscriptSearch } from "./api";
import { formatFilterDateModeLabel } from "./filterDateMode";
import {
  msgSearchDateModeAriaLabel,
  readMsgSearchDateMode,
  writeMsgSearchDateMode,
} from "./msgSearchDateMode";
import { FilterInputWithClear, submitFilterPanel } from "./SessionFilterBar";
import type { SourceFilter } from "./sourceFilter";
import type { TranscriptSearchHit } from "./types";

type Props = {
  pathPrefix: string;
  workspaces: string[];
  sourceFilter: SourceFilter;
};

export function MessageSearchPanel({
  pathPrefix,
  workspaces,
  sourceFilter,
}: Props) {
  const [messageQ, setMessageQ] = React.useState("");
  const [workspaceFilter, setWorkspaceFilter] = React.useState("");
  const [dateField, setDateField] = React.useState(readMsgSearchDateMode);
  const [rangeFrom, setRangeFrom] = React.useState("");
  const [rangeTo, setRangeTo] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");

  const [hits, setHits] = React.useState<TranscriptSearchHit[]>([]);
  const [capped, setCapped] = React.useState(false);
  const [resultLimit, setResultLimit] = React.useState(200);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onDateFieldToggle = React.useCallback(() => {
    setDateField((current) => {
      const next = current === "created" ? "updated" : "created";
      writeMsgSearchDateMode(next);
      return next;
    });
  }, []);

  const snap = React.useMemo(
    () => ({
      pathPrefix,
      workspaceFilter,
      messageQ,
      dateField,
      rangeFrom,
      rangeTo,
      roleFilter,
      workspaces,
      sourceFilter,
    }),
    [
      pathPrefix,
      workspaceFilter,
      messageQ,
      dateField,
      rangeFrom,
      rangeTo,
      roleFilter,
      workspaces,
      sourceFilter,
    ]
  );
  const snapRef = React.useRef(snap);
  snapRef.current = snap;

  const runSearch = React.useCallback(async () => {
    const {
      pathPrefix: prefix,
      workspaceFilter: wf0,
      messageQ: mq,
      dateField: df,
      rangeFrom: rf0,
      rangeTo: rt0,
      roleFilter: rfRole,
      workspaces: ws,
      sourceFilter: sf,
    } = snapRef.current;

    const q = mq.trim();
    if (!q) {
      return;
    }

    let wf = wf0.trim();
    const p = prefix.trim();
    if (!wf && p) {
      const under = ws.filter(
        (w) => w === p || w.startsWith(p + "/") || w.startsWith(p + "\\")
      );
      if (under.length === 1) wf = under[0]!;
    }

    const rf = rf0.trim();
    const rt = rt0.trim();
    const rfMs = rf ? Date.parse(rf) : NaN;
    const rtMs = rt ? Date.parse(rt) : NaN;
    if ((rf && Number.isNaN(rfMs)) || (rt && Number.isNaN(rtMs))) {
      setError('Invalid "from" or "to" datetime.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const out = await fetchTranscriptSearch({
        q,
        pathPrefix: p || undefined,
        workspace: wf || undefined,
        dateField: df,
        rangeFrom: rf && !Number.isNaN(rfMs) ? new Date(rfMs).toISOString() : undefined,
        rangeTo: rt && !Number.isNaN(rtMs) ? new Date(rtMs).toISOString() : undefined,
        limit: 500,
        role: rfRole.trim() || undefined,
        source: sf,
      });
      setHits(out.hits);
      setCapped(out.capped);
      setResultLimit(out.limit);
    } catch (e) {
      setError((e as Error).message);
      setHits([]);
      setCapped(false);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setHits([]);
    setCapped(false);
    setError(null);
    if (messageQ.trim()) {
      void runSearch();
    }
  }, [sourceFilter, runSearch]);

  const searchDisabled = !messageQ.trim() || loading;

  return (
    <>
      <section className="filters cyber-panel session-filter-bar">
        <form
          className="session-filter-bar__form"
          onSubmit={(e) =>
            submitFilterPanel(e, searchDisabled, () => void runSearch())
          }
        >
        <div className="session-filter-bar__content">
          <div className="session-filter-bar__date-row">
            <div className="session-filter-bar__date-header field">
              <span className="session-filter-bar__date-label">
                Scan sessions by{" "}
                <button
                  type="button"
                  className="session-filter-bar__date-mode"
                  aria-label={msgSearchDateModeAriaLabel(dateField)}
                  onClick={onDateFieldToggle}
                >
                  {formatFilterDateModeLabel(dateField)}
                </button>
              </span>
            </div>
            <label className="field session-filter-bar__field">
              <span>From</span>
              <input
                className="cyber-input"
                type="datetime-local"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
            </label>
            <span
              className="session-filter-bar__date-separator"
              aria-hidden="true"
            >
              →
            </span>
            <label className="field session-filter-bar__field">
              <span>To</span>
              <input
                className="cyber-input"
                type="datetime-local"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </label>
          </div>
          <div className="session-filter-bar__text-row">
            <FilterInputWithClear
              id="msg-search-message-q"
              label="Message text"
              value={messageQ}
              onChange={setMessageQ}
              placeholder="substring in JSONL lines (case-insensitive)"
            />
            <FilterInputWithClear
              id="msg-search-workspace"
              label="Workspace"
              value={workspaceFilter}
              onChange={setWorkspaceFilter}
              placeholder="optional exact workspace path"
              list="msg-workspace-list"
            />
            <datalist id="msg-workspace-list">
              {workspaces.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
            <FilterInputWithClear
              id="msg-search-role"
              label="Role"
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="optional: user, assistant, …"
              list="msg-role-list"
            />
            <datalist id="msg-role-list">
              <option value="user" />
              <option value="assistant" />
              <option value="system" />
              <option value="tool" />
            </datalist>
          </div>
        </div>
        <button
          type="submit"
          className={[
            "session-filter-bar__refresh",
            loading ? "session-filter-bar__refresh--loading" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={searchDisabled}
          aria-label="Search transcripts"
        >
          Search transcripts
        </button>
        </form>
      </section>
      <p className="msg-search-hint">
        Scopes which session JSONL files are scanned: optional repo prefix
        (sidebar), optional workspace, and optional session created/updated
        range. Leave dates empty to search all matching files (may be slow on
        large histories). Optional role limits hits to lines whose JSON object
        has that <code>role</code> string (case-insensitive).
      </p>
      {error && <div className="table-error">{error}</div>}
      {loading && <div className="table-loading">Searching…</div>}
      {!loading && !error && hits.length === 0 && (
        <div className="table-loading muted">No results yet.</div>
      )}
      {!loading && hits.length > 0 && (
        <>
          {capped && (
            <div className="table-loading">
              Showing first {resultLimit} hits (cap reached).
            </div>
          )}
          <div className="session-table-wrap">
            <table className="session-table cyber-table msg-results-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Session</th>
                  <th>Name</th>
                  <th>Workspace</th>
                  <th>Role</th>
                  <th>Line</th>
                  <th>Preview</th>
                  <th className="table-actions-col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {hits.map((h, i) => (
                  <tr key={`${h.sessionId}-${h.lineNumber}-${i}`}>
                    <td
                      title={
                        h.sortAt > 0
                          ? `${formatLocaleDateTimeTitle(h.sortAt)} (${h.timeSource === "message" ? "message" : "session updated"})`
                          : undefined
                      }
                    >
                      {h.sortAt > 0 ? (
                        formatLocaleDateTime(h.sortAt)
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <SessionIdCell sessionId={h.sessionId} />
                    </td>
                    <td>
                      {h.sessionName ?? (
                        <span className="muted">(no name)</span>
                      )}
                    </td>
                    <td>
                      <CopyableCell
                        text={h.workspacePath}
                        label="workspace path"
                      >
                        <span title={h.workspacePath}>{h.workspaceLeaf}</span>
                      </CopyableCell>
                    </td>
                    <td>
                      {h.role ?? <span className="muted">—</span>}
                    </td>
                    <td>{h.lineNumber}</td>
                    <td className="msg-preview" title={h.transcriptPath}>
                      {h.preview}
                    </td>
                    <td className="table-actions-col">
                      <SessionActionsCell
                        sessionId={h.sessionId}
                        workspacePath={h.workspacePath}
                        sessionName={h.sessionName}
                        source={h.source}
                        resumeCommand={h.resumeCommand}
                        primaryActions={[]}
                        initialLineNumber={h.lineNumber}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
