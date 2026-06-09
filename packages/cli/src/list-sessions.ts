import path from "node:path";
import {
  filterSessions,
  loadAllSessions,
  parseMetadataFilterFromCliPairs,
  type ProviderRegistry,
  type Session,
} from "@asb/core";
import { parseCliDate } from "./date-parse.js";
import { sessionFilterForSource, type SourceFilterArg } from "./source-filter.js";

export type ListSessionsOptions = {
  workspaceArg: string | true | undefined;
  sourceFilter: SourceFilterArg;
  sessionName?: string;
  createdBefore?: string;
  createdAfter?: string;
  updatedBefore?: string;
  updatedAfter?: string;
  metadata?: string[];
  json?: boolean;
};

function printSessionsTable(rows: Session[], json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        rows.map((r) => ({
          sessionId: r.sessionId,
          name: r.name ?? null,
          source: r.source,
          metadata:
            r.metadata && Object.keys(r.metadata).length > 0
              ? r.metadata
              : null,
          workspacePath: r.workspacePath,
          workspaceLeaf: r.workspaceLeaf,
          workspaceRoots: r.workspaceRoots,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          createdAtIso: new Date(r.createdAt).toISOString(),
          updatedAtIso: new Date(r.updatedAt).toISOString(),
        })),
        null,
        2
      )
    );
    return;
  }
  for (const r of rows) {
    const name = r.name ?? "";
    console.log(
      [
        r.sessionId,
        r.source,
        name.replace(/\t/g, " "),
        r.workspacePath,
        new Date(r.createdAt).toISOString(),
        new Date(r.updatedAt).toISOString(),
      ].join("\t")
    );
  }
}

function requestedProviderIds(
  sourceFilter: SourceFilterArg,
  registry: ProviderRegistry
): string[] {
  if (sourceFilter === "all") {
    return registry.ids();
  }
  return [sourceFilter];
}

/** List sessions with stderr warnings for unavailable providers. Returns exit code. */
export async function runListSessions(
  registry: ProviderRegistry,
  opts: ListSessionsOptions
): Promise<number> {
  const { sessions, unavailable } = await loadAllSessions(registry);
  const requested = new Set(requestedProviderIds(opts.sourceFilter, registry));

  for (const u of unavailable) {
    if (!requested.has(u.providerId)) {
      continue;
    }
    console.error(
      `warning: ${u.providerId} unavailable: ${u.message}`
    );
  }

  const requestedUnavailable = unavailable.filter((u) =>
    requested.has(u.providerId)
  );
  const hasSessionsFromRequested = sessions.some((s) =>
    requested.has(s.source)
  );

  if (!hasSessionsFromRequested && requestedUnavailable.length > 0) {
    return 1;
  }

  let filtered = sessions;
  const listArg = opts.workspaceArg;
  if (listArg !== undefined) {
    if (listArg === true) {
      const cwd = path.resolve(process.cwd());
      filtered = filterSessions(
        filtered,
        { workspacePrefix: cwd },
        registry
      );
    } else {
      const w = path.resolve(String(listArg));
      filtered = filterSessions(
        filtered,
        { workspacePrefix: w },
        registry
      );
    }
  }

  filtered = filterSessions(
    filtered,
    sessionFilterForSource(opts.sourceFilter),
    registry
  );

  if (opts.sessionName) {
    filtered = filterSessions(
      filtered,
      { nameOrId: opts.sessionName },
      registry
    );
  }
  if (opts.createdBefore) {
    filtered = filterSessions(
      filtered,
      { createdBefore: parseCliDate(opts.createdBefore) },
      registry
    );
  }
  if (opts.createdAfter) {
    filtered = filterSessions(
      filtered,
      { createdAfter: parseCliDate(opts.createdAfter) },
      registry
    );
  }
  if (opts.updatedBefore) {
    filtered = filterSessions(
      filtered,
      { updatedBefore: parseCliDate(opts.updatedBefore) },
      registry
    );
  }
  if (opts.updatedAfter) {
    filtered = filterSessions(
      filtered,
      { updatedAfter: parseCliDate(opts.updatedAfter) },
      registry
    );
  }
  const metadataFilter = parseMetadataFilterFromCliPairs(opts.metadata);
  if (metadataFilter) {
    filtered = filterSessions(filtered, { metadataFilter }, registry);
  }

  const useJson = Boolean(opts.json || process.env.ASB_JSON);
  if (!useJson) {
    console.log(
      "sessionId\tsource\tname\tworkspacePath\tcreatedAt\tupdatedAt"
    );
  }
  printSessionsTable(filtered, useJson);
  return 0;
}
