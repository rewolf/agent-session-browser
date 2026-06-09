import cors from "cors";
import express from "express";
import {
  filterSessions,
  findSessionById,
  formatResumeCommand,
  loadBrowserData,
  loadSessionConversationBySource,
  parseMetadataFilterFromQuery,
  providersToDescriptors,
  resolveSystemUsername,
  hitSortKey,
  searchTranscriptLines,
  sessionsUnderPath,
  type ProviderRegistry,
  type Session,
  type SessionSource,
} from "@asb/core";
import { scopeBrowserData } from "./browser-scope.js";
import { serializeSession } from "./session-response.js";
import { parseSourceQuery } from "./source-query.js";

function ambiguousSessionSourceError(registry: ProviderRegistry): string {
  const ids = registry.ids().join("|");
  return `Cannot determine session source. Pass ?source=${ids} (or the relevant provider id), or ensure the session id is in the indexed session list.`;
}

export function createServer(registry: ProviderRegistry) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      cursorUserDir: process.env.CURSOR_USER_DIR ?? null,
    });
  });

  app.get("/api/providers", async (_req, res) => {
    try {
      res.json(await providersToDescriptors(registry.all()));
    } catch (e) {
      res.status(500).json({ error: invalidSourceMessage(e) });
    }
  });

  app.get("/api/tree", async (req, res) => {
    try {
      const source = parseSourceQuery(req.query.source, registry);
      const { navTree } = scopeBrowserData(
        await loadBrowserData(registry),
        source,
        registry
      );
      res.json(navTree ?? null);
    } catch (e) {
      res.status(400).json({ error: invalidSourceMessage(e) });
    }
  });

  app.get("/api/workspaces", async (req, res) => {
    try {
      const source = parseSourceQuery(req.query.source, registry);
      const { workspaces } = scopeBrowserData(
        await loadBrowserData(registry),
        source,
        registry
      );
      res.json({ paths: workspaces });
    } catch (e) {
      res.status(400).json({ error: invalidSourceMessage(e) });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const source = parseSourceQuery(req.query.source, registry);
      const browserData = await loadBrowserData(registry);
      let { sessions } = scopeBrowserData(browserData, source, registry);
      const unavailable = scopeUnavailable(browserData, source);
      const workspace =
        typeof req.query.workspace === "string"
          ? req.query.workspace
          : undefined;
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const dateField =
        req.query.dateField === "updated" ? "updated" : "created";
      const rangeFrom = parseOptionalMs(req.query.rangeFrom);
      const rangeTo = parseOptionalMs(req.query.rangeTo);

      if (workspace?.trim()) {
        sessions = filterSessions(sessions, {
          workspacePath: workspace.trim(),
        }, registry);
      }
      if (q?.trim()) {
        sessions = filterSessions(sessions, { nameOrId: q.trim() }, registry);
      }
      const metadataFilter = parseMetadataFilterFromQuery(
        req.query as Record<string, unknown>
      );
      if (metadataFilter) {
        sessions = filterSessions(sessions, { metadataFilter }, registry);
      }
      if (rangeFrom !== undefined || rangeTo !== undefined) {
        sessions = sessions.filter((s) => {
          const t = dateField === "updated" ? s.updatedAt : s.createdAt;
          if (rangeFrom !== undefined && t < rangeFrom) return false;
          if (rangeTo !== undefined && t > rangeTo) return false;
          return true;
        });
      }

      const payload = sessions.map((session) => serializeSession(session, registry));
      res.json({ sessions: payload, unavailable });
    } catch (e) {
      res.status(400).json({ error: invalidSourceMessage(e) });
    }
  });

  app.get("/api/sessions/:sessionId/conversation", async (req, res) => {
    const sessionId = req.params.sessionId;
    if (!SESSION_ID_RE.test(sessionId)) {
      res.status(400).json({ error: "Invalid session id." });
      return;
    }
    let conversationSource: SessionSource | undefined;
    try {
      if (req.query.source !== undefined && req.query.source !== "") {
        const parsed = parseSourceQuery(req.query.source, registry);
        if (parsed !== "all") {
          conversationSource = parsed;
        }
      }
    } catch (e) {
      res.status(400).json({ error: invalidSourceMessage(e) });
      return;
    }

    const { sessions: allSessions } = await loadBrowserData(registry);
    const row = findSessionById(allSessions, sessionId);
    const sourceForLoad: SessionSource | undefined =
      conversationSource ?? row?.source;
    if (!sourceForLoad) {
      res.status(400).json({ error: ambiguousSessionSourceError(registry) });
      return;
    }

    try {
      const conversation = await loadSessionConversationBySource(
        sessionId,
        sourceForLoad,
        registry
      );
      if (!conversation) {
        res.status(404).json({
          error: "No agent transcript found for this session.",
        });
        return;
      }
      res.json({
        ...conversation,
        sessionName: row?.name ?? null,
        systemUsername: resolveSystemUsername(),
      });
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.get("/api/transcript-search", async (req, res) => {
    let sourceFilter;
    try {
      sourceFilter = parseSourceQuery(req.query.source, registry);
    } catch (e) {
      res.status(400).json({ error: invalidSourceMessage(e) });
      return;
    }

    const q = typeof req.query.q === "string" ? req.query.q : "";
    if (!q.trim()) {
      res.status(400).json({ error: "Missing or empty q (search text)." });
      return;
    }

    const pathPrefix =
      typeof req.query.pathPrefix === "string" ? req.query.pathPrefix : "";
    const workspace =
      typeof req.query.workspace === "string" ? req.query.workspace : "";
    const dateField =
      req.query.dateField === "updated" ? "updated" : "created";
    const rangeFrom = parseOptionalMs(req.query.rangeFrom);
    const rangeTo = parseOptionalMs(req.query.rangeTo);
    const limitRaw =
      typeof req.query.limit === "string" ? Number(req.query.limit) : NaN;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(5000, Math.max(1, Math.trunc(limitRaw)))
      : 200;

    const role = typeof req.query.role === "string" ? req.query.role : "";

    const { sessions: allSessions } = scopeBrowserData(
      await loadBrowserData(registry),
      sourceFilter,
      registry
    );
    const metadataFilter = parseMetadataFilterFromQuery(
      req.query as Record<string, unknown>
    );
    let scopedSessions = allSessions;
    if (metadataFilter) {
      scopedSessions = filterSessions(scopedSessions, { metadataFilter }, registry);
    }
    const sessionIds = scopeSessionIdsForTranscriptSearch(scopedSessions, registry, {
      pathPrefix: pathPrefix.trim() || undefined,
      workspace: workspace.trim() || undefined,
      dateField,
      rangeFrom,
      rangeTo,
    });

    const searchSource =
      sourceFilter === "all" ? undefined : sourceFilter;

    try {
      const sessionUpdatedAt = new Map(
        allSessions.map((s) => [s.sessionId, s.updatedAt] as const)
      );
      const raw = await searchTranscriptLines(q.trim(), {
        limit,
        sessionIds,
        role: role.trim() || undefined,
        sessionUpdatedAt,
        source: searchSource,
        registry,
      });
      const hits = raw.map((h) => {
        const row = findSessionById(allSessions, h.sessionId);
        if (!row?.source) {
          throw new Error(
            `Session ${h.sessionId} has no source. This is a bug in the scanning code.`
          );
        }
        const sortAt = hitSortKey(h);
        return {
          sessionId: h.sessionId,
          source: row.source,
          resumeCommand: formatResumeCommand(row, registry),
          sessionName: row?.name ?? null,
          workspacePath: h.workspacePath,
          workspaceLeaf: h.workspaceLeaf,
          lineNumber: h.lineNumber,
          preview: h.preview,
          transcriptPath: h.jsonlPath,
          role: h.role,
          sortAt,
          sortAtIso: sortAt > 0 ? new Date(sortAt).toISOString() : null,
          timeSource: h.messageAt != null ? "message" : "session",
        };
      });
      res.json({
        hits,
        limit,
        capped: hits.length >= limit,
      });
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return app;
}

function invalidSourceMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function scopeUnavailable(
  data: Awaited<ReturnType<typeof loadBrowserData>>,
  source: ReturnType<typeof parseSourceQuery>
) {
  if (source === "all") {
    return data.unavailable;
  }
  return data.unavailable.filter((u) => u.providerId === source);
}

function scopeSessionIdsForTranscriptSearch(
  sessions: Session[],
  registry: ProviderRegistry,
  opts: {
    pathPrefix?: string;
    workspace?: string;
    dateField: "created" | "updated";
    rangeFrom?: number;
    rangeTo?: number;
  }
): ReadonlySet<string> | undefined {
  const hasPath = Boolean(opts.pathPrefix?.trim());
  const hasWs = Boolean(opts.workspace?.trim());
  const hasDate =
    opts.rangeFrom !== undefined || opts.rangeTo !== undefined;
  if (!hasPath && !hasWs && !hasDate) {
    return undefined;
  }

  let s = sessions;
  if (hasPath) {
    s = sessionsUnderPath(s, opts.pathPrefix!.trim());
  }
  if (hasWs) {
    s = filterSessions(
      s,
      { workspacePath: opts.workspace!.trim() },
      registry
    );
  }
  if (hasDate) {
    s = s.filter((row) => {
      const t =
        opts.dateField === "updated" ? row.updatedAt : row.createdAt;
      if (opts.rangeFrom !== undefined && t < opts.rangeFrom) {
        return false;
      }
      if (opts.rangeTo !== undefined && t > opts.rangeTo) {
        return false;
      }
      return true;
    });
  }
  return new Set(s.map((x) => x.sessionId));
}

const SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseOptionalMs(q: unknown): number | undefined {
  if (typeof q !== "string" || q.trim() === "") return undefined;
  const v = Date.parse(q);
  return Number.isNaN(v) ? undefined : v;
}

