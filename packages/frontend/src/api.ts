import type {
  ApiSession,
  NavTreeNode,
  SessionSource,
  TranscriptConversation,
  TranscriptSearchHit,
} from "./types";
import type { SourceFilter } from "./sourceFilter";
import { sourceFilterToQueryValue } from "./sourceFilter";

export type MetadataKeyDescriptor = {
  key: string;
  label: string;
  kind?: "text" | "enum" | "boolean";
  enumValues?: string[];
};

export type HealthStatus =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      message: string;
      remediation?: string;
    };

export type ProviderDescriptor = {
  id: string;
  displayName: string;
  badgeColor?: string;
  metadataKeys: MetadataKeyDescriptor[];
  resumeCommandName?: string;
  workspaceGrouping: string;
  healthStatus: HealthStatus;
};

export type SessionsResponse = {
  sessions: import("./types.js").ApiSession[];
  unavailable: import("./types.js").ProviderUnavailable[];
};

export async function fetchProviders(): Promise<ProviderDescriptor[]> {
  const r = await fetch("/api/providers");
  if (!r.ok) throw new Error(`/api/providers ${r.status}`);
  return r.json() as Promise<ProviderDescriptor[]>;
}

function appendSourceParam(
  p: URLSearchParams,
  source?: SourceFilter
): void {
  const v = source ? sourceFilterToQueryValue(source) : undefined;
  if (v) {
    p.set("source", v);
  }
}

export async function fetchTree(
  source?: SourceFilter
): Promise<NavTreeNode | null> {
  const p = new URLSearchParams();
  appendSourceParam(p, source);
  const qs = p.toString();
  const r = await fetch(qs ? `/api/tree?${qs}` : "/api/tree");
  if (!r.ok) throw new Error(`/api/tree ${r.status}`);
  return r.json();
}

export async function fetchWorkspaces(
  source?: SourceFilter
): Promise<string[]> {
  const p = new URLSearchParams();
  appendSourceParam(p, source);
  const qs = p.toString();
  const r = await fetch(qs ? `/api/workspaces?${qs}` : "/api/workspaces");
  if (!r.ok) throw new Error(`/api/workspaces ${r.status}`);
  const j = (await r.json()) as { paths: string[] };
  return j.paths ?? [];
}

export type SessionQuery = {
  workspace?: string;
  q?: string;
  dateField: "created" | "updated";
  rangeFrom?: string;
  rangeTo?: string;
  source?: SourceFilter;
  metadataFilter?: Record<string, string>;
};

export async function fetchSessions(q: SessionQuery): Promise<SessionsResponse> {
  const p = new URLSearchParams();
  if (q.workspace) p.set("workspace", q.workspace);
  if (q.q) p.set("q", q.q);
  p.set("dateField", q.dateField);
  if (q.rangeFrom) p.set("rangeFrom", q.rangeFrom);
  if (q.rangeTo) p.set("rangeTo", q.rangeTo);
  if (q.metadataFilter) {
    for (const [key, value] of Object.entries(q.metadataFilter)) {
      if (value.trim()) {
        p.set(`metadata.${key}`, value.trim());
      }
    }
  }
  appendSourceParam(p, q.source);
  const r = await fetch(`/api/sessions?${p.toString()}`);
  if (!r.ok) throw new Error(`/api/sessions ${r.status}`);
  const j = (await r.json()) as SessionsResponse;
  return {
    sessions: j.sessions ?? [],
    unavailable: j.unavailable ?? [],
  };
}

export type TranscriptSearchQuery = {
  q: string;
  pathPrefix?: string;
  workspace?: string;
  dateField: "created" | "updated";
  rangeFrom?: string;
  rangeTo?: string;
  limit?: number;
  /** Only lines whose JSON `role` matches (case-insensitive). */
  role?: string;
  source?: SourceFilter;
};

export async function fetchSessionConversation(
  sessionId: string,
  source?: SessionSource
): Promise<TranscriptConversation> {
  const p = new URLSearchParams();
  if (source) {
    p.set("source", source);
  }
  const qs = p.toString();
  const r = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/conversation${qs ? `?${qs}` : ""}`
  );
  if (!r.ok) {
    const errBody = (await r.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      errBody?.error ?? `/api/sessions/${sessionId}/conversation ${r.status}`
    );
  }
  return r.json() as Promise<TranscriptConversation>;
}

export async function fetchTranscriptSearch(
  q: TranscriptSearchQuery
): Promise<{ hits: TranscriptSearchHit[]; limit: number; capped: boolean }> {
  const p = new URLSearchParams();
  p.set("q", q.q);
  p.set("dateField", q.dateField);
  if (q.pathPrefix?.trim()) p.set("pathPrefix", q.pathPrefix.trim());
  if (q.workspace?.trim()) p.set("workspace", q.workspace.trim());
  if (q.rangeFrom) p.set("rangeFrom", q.rangeFrom);
  if (q.rangeTo) p.set("rangeTo", q.rangeTo);
  if (q.limit !== undefined) p.set("limit", String(q.limit));
  if (q.role?.trim()) p.set("role", q.role.trim());
  appendSourceParam(p, q.source);
  const r = await fetch(`/api/transcript-search?${p.toString()}`);
  if (!r.ok) {
    const errBody = (await r.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      errBody?.error ?? `/api/transcript-search ${r.status}`
    );
  }
  return r.json() as Promise<{
    hits: TranscriptSearchHit[];
    limit: number;
    capped: boolean;
  }>;
}
