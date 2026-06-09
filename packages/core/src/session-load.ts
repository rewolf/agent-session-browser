import { buildNavTreeForSessions } from "./nav-tree.js";
import type {
  ProviderRegistry,
  ScanUnavailable,
  SessionProvider,
} from "./provider.js";
import type { Session, SessionSource } from "./types.js";
import { uniqueWorkspacePaths } from "./session-filters.js";
import type { NavTreeNode } from "./types.js";

export type ProviderUnavailable = ScanUnavailable & {
  providerId: SessionSource;
};

export type LoadSessionsResult = {
  sessions: Session[];
  unavailable: ProviderUnavailable[];
};

/** Scan every registered provider; collect sessions and unavailable markers. */
export async function loadAllSessions(
  registry: ProviderRegistry
): Promise<LoadSessionsResult> {
  const sessions: Session[] = [];
  const unavailable: ProviderUnavailable[] = [];

  for (const p of registry.all()) {
    const result = await p.scanSessions();
    sessions.push(...result.sessions);
    if (result.unavailable) {
      unavailable.push({ providerId: p.id, ...result.unavailable });
    }
  }

  return { sessions, unavailable };
}

export type BrowserData = {
  sessions: Session[];
  workspaces: string[];
  navTree: NavTreeNode | null;
  unavailable: ProviderUnavailable[];
};

/** Workspace paths and nav tree from merged scan results. */
export function browserDataFromSessions(
  sessions: Session[],
  registry: ProviderRegistry,
  unavailable: ProviderUnavailable[] = []
): BrowserData {
  return {
    sessions,
    workspaces: uniqueWorkspacePaths(sessions),
    navTree: buildNavTreeForSessions(sessions, registry),
    unavailable,
  };
}

export async function loadBrowserData(
  registry: ProviderRegistry
): Promise<BrowserData> {
  const { sessions, unavailable } = await loadAllSessions(registry);
  return browserDataFromSessions(sessions, registry, unavailable);
}

/** Default health when a provider omits healthCheck. */
export async function resolveProviderHealth(
  provider: SessionProvider
): Promise<import("./provider.js").HealthStatus> {
  if (provider.healthCheck) {
    return provider.healthCheck();
  }
  return { ok: true };
}
